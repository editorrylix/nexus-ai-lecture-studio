using System;
using System.Diagnostics;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Threading;
using CSCore.CoreAudioAPI;
using CSCore;

namespace ClientAudioHook
{
    class Program
    {
        [MTAThread]
        static void Main(string[] args)
        {
            if (args.Length > 0 && args[0].Equals("--list", StringComparison.OrdinalIgnoreCase))
            {
                var procs = GetValidProcesses();
                var items = new System.Collections.Generic.List<string>();
                items.Add("{\"pid\":0,\"name\":\"Entire System Audio (All Apps & Meetings)\",\"title\":\"Entire System Audio (All Apps & Meetings)\"}");
                foreach (var p in procs)
                {
                    string title = !string.IsNullOrEmpty(p.MainWindowTitle) ? p.MainWindowTitle : p.ProcessName;
                    string cleanTitle = title.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "");
                    string cleanName = p.ProcessName.Replace("\\", "\\\\").Replace("\"", "\\\"");
                    items.Add($"{{\"pid\":{p.Id},\"name\":\"{cleanName}\",\"title\":\"{cleanTitle}\"}}");
                }
                Console.WriteLine("[" + string.Join(",", items) + "]");
                return;
            }

            Console.WriteLine("=== Local-First Meeting Transcription ===");
            var validProcesses = GetValidProcesses();

            uint selectedPid = 0;
            bool isHeadless = args.Length > 0 && uint.TryParse(args[0], out selectedPid);

            if (isHeadless)
            {
                IAudioCapturer capturer;
                if (selectedPid == 0)
                {
                    Console.WriteLine("[HEADLESS] Starting Master System Audio Loopback (All Apps & Meetings)...");
                    capturer = new MasterAudioCapture();
                }
                else
                {
                    Console.WriteLine($"[HEADLESS] Starting Process Loopback for PID: {selectedPid}...");
                    capturer = new ProcessAudioCapture(selectedPid);
                }

                if (!capturer.Start())
                {
                    if (selectedPid != 0)
                    {
                        Console.WriteLine($"[FALLBACK] Process Loopback for PID {selectedPid} failed. Falling back to Master System Audio Loopback...");
                        capturer = new MasterAudioCapture();
                        if (!capturer.Start())
                        {
                            Console.WriteLine("[ERROR] Failed to start audio capture on fallback.");
                            return;
                        }
                    }
                    else
                    {
                        Console.WriteLine("[ERROR] Failed to start Master audio capture.");
                        return;
                    }
                }

                Console.WriteLine($"[STATUS:CAPTURING_PID:{selectedPid}]");
                // Wait until canceled or stdin closed
                var waitHandle = new ManualResetEvent(false);
                Console.CancelKeyPress += (s, e) => {
                    e.Cancel = true;
                    waitHandle.Set();
                };

                // Read stdin asynchronously in case parent process signals stop
                System.Threading.Tasks.Task.Run(() => {
                    try {
                        while (Console.ReadLine() != null) { }
                    } catch { }
                    waitHandle.Set();
                });

                waitHandle.WaitOne();
                capturer.Stop();
                Console.WriteLine("[STATUS:STOPPED]");
                return;
            }

            while (true)
            {
                if (validProcesses.Count == 0)
                {
                    Console.WriteLine("\n[ERROR] No applications are currently playing audio.");
                    Console.WriteLine("Please start playing audio in your target application (e.g. YouTube, Zoom) and try again.");
                    return;
                }

                int choice = SelectProcessUI(validProcesses);
                if (choice == -1) return; // Exit selected
                selectedPid = (uint)validProcesses[choice].Id;

                Console.WriteLine($"\nStarting capture for PID: {selectedPid}");
                var capture = new ProcessAudioCapture(selectedPid);
                
                if (!capture.Start())
                {
                    Console.WriteLine("\nPress any key to return to the application list...");
                    Console.ReadKey(true);
                    
                    // Refresh the process list
                    validProcesses = GetValidProcesses();
                    continue;
                }

                Console.WriteLine("Press 'Q' or Esc to stop capturing and return to the menu...");
                while (capture.IsCapturing)
                {
                    try {
                        if (Console.KeyAvailable)
                        {
                            var key = Console.ReadKey(true).Key;
                            if (key == ConsoleKey.Q || key == ConsoleKey.Escape)
                                break;
                        }
                    } catch { }
                    Thread.Sleep(100);
                }

                capture.Stop();
                Console.WriteLine("\nCapture stopped.");
                
                // Refresh processes and show menu again
                validProcesses = GetValidProcesses();
                args = new string[0]; // clear args so it doesn't auto-select again
            }
        }

        static System.Collections.Generic.List<Process> GetValidProcesses()
        {
            var validProcesses = new System.Collections.Generic.List<Process>();
            try
            {
                using (var enumerator = new MMDeviceEnumerator())
                {
                    Role[] roles = { Role.Multimedia, Role.Communications };
                    foreach (var role in roles)
                    {
                        try
                        {
                            using (var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, role))
                            using (var sessionManager = AudioSessionManager2.FromMMDevice(device))
                            using (var sessionEnumerator = sessionManager.GetSessionEnumerator())
                            {
                                foreach (var session in sessionEnumerator)
                                {
                                    using (var sessionControl = session.QueryInterface<AudioSessionControl2>())
                                    {
                                        var pid = sessionControl.ProcessID;
                                        if (pid > 0)
                                        {
                                            try
                                            {
                                                var proc = Process.GetProcessById(pid);
                                                if (!validProcesses.Exists(p => p.Id == proc.Id))
                                                    validProcesses.Add(proc);
                                            }
                                            catch { }
                                        }
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
            return validProcesses;
        }

        static int SelectProcessUI(System.Collections.Generic.List<Process> validProcesses)
        {
            int selectedIndex = 0;
            try { Console.CursorVisible = false; } catch { }

            while (true)
            {
                Console.Clear();
                Console.WriteLine("=== Local-First Meeting Transcription ===");
                Console.WriteLine("Applications currently playing audio:\n");

                for (int i = 0; i < validProcesses.Count; i++)
                {
                    string name = !string.IsNullOrEmpty(validProcesses[i].MainWindowTitle) 
                        ? validProcesses[i].MainWindowTitle 
                        : validProcesses[i].ProcessName;
                    
                    if (i == selectedIndex)
                    {
                        Console.ForegroundColor = ConsoleColor.Cyan;
                        Console.WriteLine($" > {name} (PID: {validProcesses[i].Id})");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.WriteLine($"   {name} (PID: {validProcesses[i].Id})");
                    }
                }

                Console.WriteLine("\n[Use UP/DOWN arrows to select, ENTER to capture, ESC to exit]");

                var key = Console.ReadKey(true).Key;
                if (key == ConsoleKey.UpArrow)
                {
                    selectedIndex--;
                    if (selectedIndex < 0) selectedIndex = validProcesses.Count - 1;
                }
                else if (key == ConsoleKey.DownArrow)
                {
                    selectedIndex++;
                    if (selectedIndex >= validProcesses.Count) selectedIndex = 0;
                }
                else if (key == ConsoleKey.Enter)
                {
                    try { Console.CursorVisible = true; } catch { }
                    return selectedIndex;
                }
                else if (key == ConsoleKey.Escape)
                {
                    try { Console.CursorVisible = true; } catch { }
                    return -1;
                }
            }
        }
    }

    public interface IAudioCapturer
    {
        bool Start();
        void Stop();
        bool IsCapturing { get; }
    }

    class ProcessAudioCapture : IAudioCapturer, IActivateAudioInterfaceCompletionHandler
    {
        private readonly uint _pid;
        private AudioClient _audioClient;
        private AudioCaptureClient _captureClient;
        private Thread _captureThread;
        private bool _isCapturing;
        public bool IsCapturing => _isCapturing;
        private EventWaitHandle _eventWaitHandle;
        private NamedPipeServerStream _pipeServer;
        private IActivateAudioInterfaceAsyncOperation _activationOperation;
        private ManualResetEvent _activationEvent;
        private bool _activationSuccess;
        
        // VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK
        private const string DEVINTERFACE_AUDIO_RENDER = @"VAD\Process_Loopback";

        public ProcessAudioCapture(uint pid)
        {
            _pid = pid;
        }

        public bool Start()
        {
            _activationEvent = new ManualResetEvent(false);
            _activationSuccess = false;
            var loopbackParams = new AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS
            {
                TargetProcessId = _pid,
                ProcessLoopbackMode = PROCESS_LOOPBACK_MODE.PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE
            };

            var activationParams = new AUDIOCLIENT_ACTIVATION_PARAMS
            {
                ActivationType = AUDIOCLIENT_ACTIVATION_TYPE.AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
                ProcessLoopbackParams = loopbackParams
            };

            IntPtr pActivationParams = Marshal.AllocHGlobal(Marshal.SizeOf<AUDIOCLIENT_ACTIVATION_PARAMS>());
            Marshal.StructureToPtr(activationParams, pActivationParams, false);

            var propVariant = new PROPVARIANT
            {
                vt = (ushort)VarEnum.VT_BLOB,
                wReserved1 = 0,
                wReserved2 = 0,
                wReserved3 = 0,
                cbSize = Marshal.SizeOf<AUDIOCLIENT_ACTIVATION_PARAMS>(),
                pBlobData = pActivationParams
            };

            IntPtr pPropVariant = Marshal.AllocHGlobal(Marshal.SizeOf<PROPVARIANT>());
            Marshal.StructureToPtr(propVariant, pPropVariant, false);

            Guid iidAudioClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"); // IID_IAudioClient

            NativeMethods.ActivateAudioInterfaceAsync(
                DEVINTERFACE_AUDIO_RENDER,
                iidAudioClient,
                pPropVariant,
                this,
                out _activationOperation);

            // Wait for activation to complete
            _activationEvent.WaitOne();
            return _activationSuccess;
        }

        public void Stop()
        {
            _isCapturing = false;
            _eventWaitHandle?.Set();
            _captureThread?.Join();
            
            _audioClient?.Stop();
            _audioClient?.Dispose();
            _captureClient?.Dispose();
            _pipeServer?.Dispose();
        }

        public void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation)
        {
            try
            {
                activateOperation.GetActivateResult(out int hr, out object activatedInterface);
                if (hr != 0 || activatedInterface == null)
                {
                    if (hr == unchecked((int)0x80070002))
                    {
                        Console.WriteLine("\n[ERROR] No active audio session found for this process.");
                        Console.WriteLine("Make sure the target application is CURRENTLY playing audio (e.g. a YouTube video or meeting is active) BEFORE starting the capture.");
                    }
                    else
                    {
                        Console.WriteLine($"Failed to activate audio interface. HR: {hr}");
                    }
                    _activationSuccess = false;
                    _activationEvent.Set();
                    return;
                }

                var ptr = Marshal.GetIUnknownForObject(activatedInterface);
                _audioClient = new AudioClient(ptr);
                
                // Get the actual system mix format from the default render device!
                // Process Loopback requires EXACT match with engine format, but GetMixFormat is E_NOTIMPL on loopback clients.
                WaveFormat multimediaFormat;
                WaveFormat commsFormat;
                using (var enumerator = new MMDeviceEnumerator())
                {
                    using (var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia))
                    using (var normalClient = AudioClient.FromMMDevice(device))
                    {
                        multimediaFormat = normalClient.MixFormat;
                    }
                    try {
                        using (var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Communications))
                        using (var normalClient = AudioClient.FromMMDevice(device))
                        {
                            commsFormat = normalClient.MixFormat;
                        }
                    } catch { commsFormat = multimediaFormat; }
                }
                
                Console.WriteLine($"Discovered System Audio Formats - Multimedia: {multimediaFormat.SampleRate}Hz, Comms: {commsFormat.SampleRate}Hz");

                long bufferDuration = 10000000; // 1 second
                uint flags = 0x00020000 | 0x00040000; // LOOPBACK | EVENTCALLBACK

                WaveFormat activeFormat = multimediaFormat;
                try
                {
                    _audioClient.Initialize(AudioClientShareMode.Shared, (AudioClientStreamFlags)flags, bufferDuration, 0, multimediaFormat, Guid.Empty);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to init with Multimedia format ({ex.HResult:X}), trying Communications format...");
                    activeFormat = commsFormat;
                    _audioClient.Initialize(AudioClientShareMode.Shared, (AudioClientStreamFlags)flags, bufferDuration, 0, commsFormat, Guid.Empty);
                }

                _eventWaitHandle = new EventWaitHandle(false, EventResetMode.AutoReset);
                _audioClient.SetEventHandle(_eventWaitHandle.SafeWaitHandle.DangerousGetHandle());

                _captureClient = AudioCaptureClient.FromAudioClient(_audioClient);

                _isCapturing = true;
                _activationSuccess = true;
                
                // Set event BEFORE waiting for connection, so Main thread unblocks!
                _activationEvent.Set();

                Console.WriteLine("Setting up Named Pipe Server...");
                _pipeServer = new NamedPipeServerStream("AudioCapturePipe", PipeDirection.Out, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                
                Console.WriteLine("Waiting for Python client to connect...");
                
                // Wait asynchronously or just block this background thread
                _pipeServer.WaitForConnection();
                Console.WriteLine("Python client connected!");

                _audioClient.Start();

                _captureThread = new Thread(() => CaptureLoop(activeFormat));
                _captureThread.Start();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR] Setup failed: {ex.Message}");
                _activationSuccess = false;
                _activationEvent?.Set();
            }
        }

        private void CaptureLoop(WaveFormat format)
        {
            int bytesPerFrame = format.Channels * (format.BitsPerSample / 8);
            byte[] buffer = new byte[8192];

            try
            {
                while (_isCapturing)
                {
                    _eventWaitHandle.WaitOne();
                    if (!_isCapturing) break;

                    while (_captureClient.GetNextPacketSize() > 0)
                    {
                        IntPtr dataPtr = _captureClient.GetBuffer(out int numFramesToRead, out AudioClientBufferFlags flags);
                        int bytesToRead = numFramesToRead * bytesPerFrame;

                        if (buffer.Length < bytesToRead)
                            buffer = new byte[bytesToRead];

                        if ((flags & AudioClientBufferFlags.Silent) == AudioClientBufferFlags.Silent)
                        {
                            Array.Clear(buffer, 0, bytesToRead);
                        }
                        else
                        {
                            Marshal.Copy(dataPtr, buffer, 0, bytesToRead);
                        }

                        _captureClient.ReleaseBuffer(numFramesToRead);

                        if (_pipeServer.IsConnected && bytesToRead > 0)
                        {
                            try
                            {
                                _pipeServer.Write(buffer, 0, bytesToRead);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine("Pipe write error: " + ex.Message);
                                _isCapturing = false;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR] Capture Loop crashed: {ex.Message}");
                _isCapturing = false;
            }
            finally
            {
                Console.WriteLine("Capture loop stopped.");
            }
        }
    }

    class MasterAudioCapture : IAudioCapturer
    {
        private AudioClient? _audioClient;
        private AudioCaptureClient? _captureClient;
        private Thread? _captureThread;
        private bool _isCapturing;
        public bool IsCapturing => _isCapturing;
        private EventWaitHandle? _eventWaitHandle;
        private NamedPipeServerStream? _pipeServer;

        public bool Start()
        {
            try
            {
                using (var enumerator = new MMDeviceEnumerator())
                using (var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia))
                {
                    _audioClient = AudioClient.FromMMDevice(device);
                    var mixFormat = _audioClient.MixFormat;

                    Console.WriteLine($"[MASTER LOOPBACK] Format: {mixFormat.SampleRate}Hz, {mixFormat.Channels}ch, {mixFormat.BitsPerSample}bit");

                    long bufferDuration = 10000000; // 1 second
                    uint flags = 0x00020000 | 0x00040000; // LOOPBACK | EVENTCALLBACK

                    _audioClient.Initialize(AudioClientShareMode.Shared, (AudioClientStreamFlags)flags, bufferDuration, 0, mixFormat, Guid.Empty);

                    _eventWaitHandle = new EventWaitHandle(false, EventResetMode.AutoReset);
                    _audioClient.SetEventHandle(_eventWaitHandle.SafeWaitHandle.DangerousGetHandle());

                    _captureClient = AudioCaptureClient.FromAudioClient(_audioClient);
                    _isCapturing = true;

                    Console.WriteLine("Setting up Named Pipe Server for System Loopback...");
                    _pipeServer = new NamedPipeServerStream("AudioCapturePipe", PipeDirection.Out, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);

                    Console.WriteLine("Waiting for Python client to connect...");
                    _pipeServer.WaitForConnection();
                    Console.WriteLine("Python client connected!");

                    _audioClient.Start();

                    _captureThread = new Thread(() => CaptureLoop(mixFormat));
                    _captureThread.Start();
                    return true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Master audio capture initialization failed: {ex.Message}");
                return false;
            }
        }

        public void Stop()
        {
            _isCapturing = false;
            _eventWaitHandle?.Set();
            _captureThread?.Join();

            try { _audioClient?.Stop(); } catch { }
            try { _audioClient?.Dispose(); } catch { }
            try { _captureClient?.Dispose(); } catch { }
            try { _pipeServer?.Dispose(); } catch { }
        }

        private void CaptureLoop(WaveFormat format)
        {
            int bytesPerFrame = format.Channels * (format.BitsPerSample / 8);
            byte[] buffer = new byte[8192];

            try
            {
                while (_isCapturing && _eventWaitHandle != null && _captureClient != null)
                {
                    _eventWaitHandle.WaitOne();
                    if (!_isCapturing) break;

                    while (_captureClient.GetNextPacketSize() > 0)
                    {
                        IntPtr dataPtr = _captureClient.GetBuffer(out int numFramesToRead, out AudioClientBufferFlags flags);
                        int bytesToRead = numFramesToRead * bytesPerFrame;

                        if (buffer.Length < bytesToRead)
                            buffer = new byte[bytesToRead];

                        if ((flags & AudioClientBufferFlags.Silent) == AudioClientBufferFlags.Silent)
                        {
                            Array.Clear(buffer, 0, bytesToRead);
                        }
                        else
                        {
                            Marshal.Copy(dataPtr, buffer, 0, bytesToRead);
                        }

                        _captureClient.ReleaseBuffer(numFramesToRead);

                        if (_pipeServer != null && _pipeServer.IsConnected && bytesToRead > 0)
                        {
                            try
                            {
                                _pipeServer.Write(buffer, 0, bytesToRead);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine("Master pipe write error: " + ex.Message);
                                _isCapturing = false;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR] Master Capture Loop crashed: {ex.Message}");
                _isCapturing = false;
            }
            finally
            {
                Console.WriteLine("Master capture loop stopped.");
            }
        }
    }
}
