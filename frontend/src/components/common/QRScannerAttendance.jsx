import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { organizerAPI } from '../../services/api';

const QRScannerAttendance = ({ eventId }) => {
  const [mode, setMode] = useState('manual'); // 'scanner' | 'manual' | 'upload'
  const [ticketId, setTicketId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);
  const [notScanned, setNotScanned] = useState([]);
  const [showCheckedIn, setShowCheckedIn] = useState(false);
  const [showNotScanned, setShowNotScanned] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerActive = useRef(false);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const lastScannedRef = useRef('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await organizerAPI.getAttendanceStats(eventId);
      setStats(res.data.stats);
      setRecentCheckins(res.data.recentCheckins || []);
      setCheckedIn(res.data.checkedIn || []);
      setNotScanned(res.data.notScanned || []);
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

      let decoded = null;

      // Try BarcodeDetector API first if available (faster, native)
      if ('BarcodeDetector' in window) {
        try {
          if (!detectorRef.current) {
            detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
          }
          const barcodes = await detectorRef.current.detect(canvas);
          if (barcodes.length > 0) {
            decoded = barcodes[0].rawValue;
          }
        } catch (e) {
          // detector failed, fall through to jsQR
        }
      }

      // Fallback to jsQR (works everywhere)
      if (!decoded) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrResult = jsQR(imageData.data, canvas.width, canvas.height, {
            inversionAttempts: 'dontInvert',
          });
          if (qrResult) {
            decoded = qrResult.data;
          }
        } catch (e) {
          // jsQR failed, continue scanning
        }
      }

      if (decoded && decoded.startsWith('FEL-') && decoded !== lastScannedRef.current) {
        lastScannedRef.current = decoded;
        await processTicket(decoded);
        // Debounce: prevent re-scanning same ticket for 3s
        setTimeout(() => { lastScannedRef.current = ''; }, 3000);
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
          <div className="bg-[#12122a] rounded-lg md:rounded-xl p-3 md:p-4 border border-indigo-500/20 text-center">
            <p className="text-xl md:text-2xl font-bold text-indigo-400">{stats.totalRegistrations}</p>
            <p className="text-xs md:text-sm text-gray-400">Total Registered</p>
          </div>
          <div className="bg-[#12122a] rounded-lg md:rounded-xl p-3 md:p-4 border border-indigo-500/20 text-center">
            <p className="text-xl md:text-2xl font-bold text-green-400">{stats.attended}</p>
            <p className="text-xs md:text-sm text-gray-400">Checked In</p>
          </div>
          <div className="bg-[#12122a] rounded-lg md:rounded-xl p-3 md:p-4 border border-indigo-500/20 text-center">
            <p className="text-xl md:text-2xl font-bold text-purple-400">{stats.attendanceRate}%</p>
            <p className="text-xs text-gray-400">Attendance Rate</p>
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setMode('scanner')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            mode === 'scanner' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
          }`}
        >
          📷 QR Scanner
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            mode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
          }`}
        >
          📁 Upload QR Image
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
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

      {/* File upload QR */}
      {mode === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError('');
              setResult(null);
              try {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.src = url;
                await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                const qrResult = jsQR(imageData.data, canvas.width, canvas.height);
                if (qrResult && qrResult.data) {
                  await processTicket(qrResult.data);
                } else {
                  setError('No QR code found in the uploaded image. Try a clearer image.');
                }
              } catch (err) {
                setError('Failed to read QR from image');
              }
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:cursor-pointer file:transition"
          />
          <p className="text-xs text-gray-500">Upload a screenshot or photo of a participant's QR code to check them in.</p>
        </div>
      )}

      {/* Manual entry */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value.toUpperCase())}
              placeholder="Enter ticket ID (e.g. FEL-...)"
              className="flex-1 bg-white/5 border border-gray-600 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={processing || !ticketId.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
            >
              {processing ? '…' : 'Check In'}
            </button>
          </form>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Override Reason (optional — for manual / exceptional check-ins)</label>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Ticket lost, verified via ID card"
              className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-4 border text-sm ${
          result.success
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <p className="font-semibold">{result.message}</p>
          <p className="font-mono text-xs mt-1">{result.ticketId}</p>
          {result.name && <p className="mt-1">Name: {result.name}</p>}
        </div>
      )}

      {/* ── Attendance CSV Export ── */}
      <div className="flex gap-3">
        <button
          onClick={async () => {
            try {
              const res = await organizerAPI.exportCSV(eventId);
              const blob = new Blob([res.data], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `attendance_report.csv`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              setError('CSV export failed');
            }
          }}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition"
        >
          Export Attendance CSV
        </button>
      </div>

      {/* ── Recent check-ins (with audit trail) ── */}
      {recentCheckins.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-200 mb-2">Recent Check-ins</h3>
          <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Ticket</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Time</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Method</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentCheckins.map((c, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-4 py-2 font-medium text-gray-200">{c.name || c.email}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{c.ticketId}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {new Date(c.checkedInAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.method === 'scan' ? 'bg-green-500/20 text-green-400' : c.method === 'manual' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{c.method || '—'}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{c.overrideReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Checked-In Participants ── */}
      <div>
        <button onClick={() => setShowCheckedIn(!showCheckedIn)}
          className="flex items-center gap-2 font-semibold text-gray-200 mb-2 hover:text-gray-100 transition">
          <span className="text-sm">{showCheckedIn ? '▼' : '▶'}</span>
          Checked In ({checkedIn.length})
        </button>
        {showCheckedIn && (
          <div className="bg-[#12122a] rounded-xl border border-green-500/20 overflow-hidden">
            {checkedIn.length === 0 ? (
              <p className="text-center py-6 text-gray-500 text-sm">No one checked in yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Ticket</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Checked In At</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {checkedIn.map((p) => (
                    <tr key={p._id} className="hover:bg-white/5">
                      <td className="px-4 py-2 font-medium text-gray-200">{p.name}</td>
                      <td className="px-4 py-2 text-gray-400">{p.email}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{p.ticketId}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{new Date(p.checkedInAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.method === 'scan' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>{p.method}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Not Yet Scanned Participants ── */}
      <div>
        <button onClick={() => setShowNotScanned(!showNotScanned)}
          className="flex items-center gap-2 font-semibold text-gray-200 mb-2 hover:text-gray-100 transition">
          <span className="text-sm">{showNotScanned ? '▼' : '▶'}</span>
          Not Yet Scanned ({notScanned.length})
        </button>
        {showNotScanned && (
          <div className="bg-[#12122a] rounded-xl border border-yellow-500/20 overflow-hidden">
            {notScanned.length === 0 ? (
              <p className="text-center py-6 text-gray-500 text-sm">Everyone is checked in! 🎉</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Ticket</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Registered At</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Manual Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {notScanned.map((p) => (
                    <tr key={p._id} className="hover:bg-white/5">
                      <td className="px-4 py-2 font-medium text-gray-200">{p.name}</td>
                      <td className="px-4 py-2 text-gray-400">{p.email}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{p.ticketId}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{new Date(p.registeredAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={async () => {
                            const reason = prompt('Override reason (for audit log):');
                            if (reason === null) return;
                            try {
                              await organizerAPI.markAttendance(eventId, p._id, { reason });
                              fetchStats();
                              setResult({ success: true, ticketId: p.ticketId, name: p.name, message: 'Manual check-in successful!' });
                            } catch (err) {
                              setError(err.response?.data?.message || 'Manual check-in failed');
                            }
                          }}
                          className="text-xs border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 px-3 py-1 rounded-lg transition"
                        >
                          Mark Attended
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScannerAttendance;
