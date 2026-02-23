import React, { useEffect, useRef, useState, useCallback } from 'react';
import { organizerAPI } from '../../services/api';

const QRScannerAttendance = ({ eventId }) => {
  const [mode, setMode] = useState('manual'); // 'scanner' | 'manual'
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerActive = useRef(false);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const lastScannedRef = useRef('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await organizerAPI.getAttendanceStats(eventId);
      setStats(res.data.stats);
      setRecentCheckins(res.data.recentCheckins || []);
    } catch (err) { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const processTicket = async (ticket) => {
    if (processing) return;
    setProcessing(true);
    setResult(null);
    setError('');
    try {
      const res = await organizerAPI.markAttendanceByScan(eventId, { ticketId: ticket });
      setResult({
        success: true,
        ticketId: ticket,
        name: `${res.data.registration?.participant?.firstName || ''} ${res.data.registration?.participant?.lastName || ''}`.trim(),
        message: 'Check-in successful!',
      });
      fetchStats();
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed';
      setResult({ success: false, ticketId: ticket, message: msg });
    }
    setProcessing(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    processTicket(ticketId.trim());
    setTicketId('');
  };

  // Camera-based QR scanning using BarcodeDetector API (or fallback)
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      scannerActive.current = true;
      scanFrame();
    } catch (err) {
      setError('Camera access denied. Use manual entry instead.');
      setMode('manual');
    }
  };

  const stopScanner = () => {
    scannerActive.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = async () => {
    if (!scannerActive.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Try BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          if (!detectorRef.current) {
            detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
          }
          const barcodes = await detectorRef.current.detect(canvas);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code && code.startsWith('FEL-') && code !== lastScannedRef.current) {
              lastScannedRef.current = code;
              await processTicket(code);
              // Debounce: prevent re-scanning same ticket for 3s
              setTimeout(() => { lastScannedRef.current = ''; }, 3000);
            }
          }
        } catch (e) {
          // detector failed, continue scanning
        }
      }
    }

    if (scannerActive.current) {
      requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => {
    if (mode === 'scanner') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [mode]);

  return (
    <div className="space-y-6">
      {/* Live Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xl md:text-2xl font-bold text-indigo-600">{stats.totalRegistrations}</p>
            <p className="text-xs md:text-sm text-gray-500">Total Registered</p>
          </div>
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xl md:text-2xl font-bold text-green-600">{stats.attended}</p>
            <p className="text-xs md:text-sm text-gray-500">Checked In</p>
          </div>
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
            <p className="text-xs text-gray-500">Attendance Rate</p>
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setMode('scanner')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            mode === 'scanner' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📷 QR Scanner
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Scanner */}
      {mode === 'scanner' && (
        <div className="bg-black rounded-xl overflow-hidden relative" style={{ maxWidth: 400 }}>
          <video ref={videoRef} className="w-full" style={{ display: 'block' }} playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="absolute inset-0 border-2 border-dashed border-green-400 rounded-xl pointer-events-none m-8 opacity-70" />
          <p className="text-center text-green-400 text-xs py-2 bg-black/50">
            {processing ? 'Processing…' : 'Point camera at QR code'}
          </p>
        </div>
      )}

      {/* Manual entry */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value.toUpperCase())}
            placeholder="Enter ticket ID (e.g. FEL-...)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={processing || !ticketId.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
          >
            {processing ? '…' : 'Check In'}
          </button>
        </form>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-4 border text-sm ${
          result.success
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p className="font-semibold">{result.message}</p>
          <p className="font-mono text-xs mt-1">{result.ticketId}</p>
          {result.name && <p className="mt-1">Name: {result.name}</p>}
        </div>
      )}

      {/* Recent check-ins */}
      {recentCheckins.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">Recent Check-ins</h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Ticket</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentCheckins.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-700">{c.name || c.email}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{c.ticketId}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(c.checkedInAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScannerAttendance;
