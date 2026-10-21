import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api';
const TABS = ['Notes', 'Quiz', 'Mindmap'];
const TODAY = new Date().toISOString().slice(0, 10);

const formatDateTime = (value) => {
  if (!value) return 'No uploads yet';
  return new Date(value).toLocaleString();
};

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function TodayLecture() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Notes');
  const [requestedDate, setRequestedDate] = useState('');
  const [audio, setAudio] = useState({ key: '', url: '' });
  const [loadedDate, setLoadedDate] = useState(null);
  const [noUpload, setNoUpload] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    axios.get(`${API_BASE}/lectures/today`, {
      headers: { Authorization: `Bearer ${token}` },
      params: requestedDate ? { date: requestedDate } : {},
    }).then((response) => {
      if (active) setData(response.data);
    }).catch((requestError) => {
      if (!active) return;
      if (requestError.response?.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      if (requestError.response?.status === 404) {
        setData(null);
        setNoUpload(true);
        return;
      }
      setError(requestError.response?.data?.error || 'Could not load today’s lecture.');
    }).finally(() => {
      if (active) setLoadedDate(requestedDate);
    });

    return () => {
      active = false;
    };
  }, [navigate, requestedDate, token]);

  const audioKey = `${requestedDate}:${data?.lectureUrl || ''}`;
  const audioUrl = audio.key === audioKey ? audio.url : '';
  const loading = loadedDate !== requestedDate;

  useEffect(() => {
    if (!data?.lectureUrl || !token) {
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    axios.get(`${API_BASE}${data.lectureUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: requestedDate ? { date: requestedDate } : {},
      responseType: 'blob',
    }).then((response) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(response.data);
      setAudio({ key: audioKey, url: objectUrl });
    }).catch((requestError) => {
      if (requestError.response?.status === 401) navigate('/login', { replace: true });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioKey, data?.lectureUrl, navigate, requestedDate, token]);

  const isStaff = ['teacher', 'admin'].includes(String(user?.role || '').toLowerCase());
  const myAttendance = data?.attendance?.[0];

  const downloadAttendance = () => {
    const columns = ['roll', 'name', 'status', 'subject', 'date', 'timestamp', 'device_id', 'room'];
    const rows = [columns, ...(data?.attendance || []).map((record) => columns.map((column) => record[column]))];
    const content = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${data?.date || 'today'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTab = () => {
    if (activeTab === 'Notes') {
      return <p className="whitespace-pre-wrap text-sm leading-7 text-on-surface-variant">{data?.notes || 'No notes available yet.'}</p>;
    }
    if (activeTab === 'Quiz') {
      return data?.quiz?.length ? (
        <div className="space-y-4">
          {data.quiz.map((question, index) => (
            <div key={`${question.q}-${index}`} className="rounded-xl bg-surface-container-low p-4">
              <p className="font-semibold text-on-surface">{question.q}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                {question.options?.map((option) => <li key={option}>{option}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-on-surface-variant">No quiz available yet.</p>;
    }
    return data?.mindmap?.nodes?.length ? (
      <div className="flex flex-wrap gap-3">
        {data.mindmap.nodes.map((node, index) => (
          <span key={node.id || index} className="rounded-full bg-primary-container/10 px-4 py-2 text-sm text-primary-container">
            {node.label || node.name || String(node)}
          </span>
        ))}
      </div>
    ) : <p className="text-sm text-on-surface-variant">Mind map is not available yet.</p>;
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-gutter py-space-xl">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Today’s Lecture</p>
          <h1 className="mt-1 text-2xl font-bold text-on-surface">
            Room {data?.room || '301'} - Virtual
          </h1>
        </div>
        <div className="flex flex-col gap-2 text-sm text-on-surface-variant md:items-end">
          <span className="inline-flex items-center gap-2 font-medium text-on-surface">
            <span className={`h-2.5 w-2.5 rounded-full ${noUpload ? 'bg-outline' : 'animate-pulse bg-tertiary-container'}`} />
            {noUpload ? 'Waiting for IoT upload' : 'Live IoT Connected'}
          </span>
          <span>Last upload: {formatDateTime(data?.lastUploadTime)}</span>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-error/30 bg-error-container/30 p-4 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">Loading lecture…</div>
      ) : noUpload ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline">sensors_off</span>
          <h2 className="mt-3 text-xl font-semibold text-on-surface">No lecture today</h2>
          <p className="mt-2 text-sm text-on-surface-variant">IoT attendance and audio will appear here after the device uploads them.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
          <section className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-on-surface">Lecture recording</h2>
              {audioUrl ? (
                <audio className="w-full" controls src={audioUrl}>Your browser does not support audio playback.</audio>
              ) : (
                <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No lecture today — no audio file was uploaded.</p>
              )}
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-on-surface">Transcript</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-on-surface-variant">
                {data?.transcript || 'Transcript is not available yet.'}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
              <div className="flex gap-2 border-b border-outline-variant/30 px-5 pt-4">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-primary-container text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="min-h-32 p-5">{renderTab()}</div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-on-surface">Today’s Attendance</h2>
              {isStaff && (
                <button type="button" onClick={downloadAttendance} disabled={!data?.attendance?.length} className="rounded-lg px-3 py-2 text-xs font-semibold text-primary-container hover:bg-surface-container-low disabled:opacity-40">
                  Download CSV
                </button>
              )}
            </div>

            {isStaff && (
              <label className="mt-4 block text-xs font-medium text-on-surface-variant">
                Daily history
                <input
                  type="date"
                  value={requestedDate || data?.date || ''}
                  max={TODAY}
                  onChange={(event) => {
                    setError('');
                    setNoUpload(false);
                    setRequestedDate(event.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                />
              </label>
            )}

            {!data?.attendance?.length ? (
              <p className="mt-5 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Attendance not marked yet.
              </p>
            ) : isStaff ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-on-surface-variant">
                    <tr><th className="pb-2 pr-3">Roll</th><th className="pb-2 pr-3">Name</th><th className="pb-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {data.attendance.map((record, index) => (
                      <tr key={`${record.roll}-${record.name}-${index}`} className="border-t border-outline-variant/20">
                        <td className="py-2 pr-3 text-on-surface-variant">{record.roll || '—'}</td>
                        <td className="py-2 pr-3 font-medium text-on-surface">{record.name}</td>
                        <td className="py-2 text-on-surface-variant">{record.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-surface-container-low p-4">
                <p className="font-semibold text-on-surface">My Attendance</p>
                <p className="mt-2 text-sm text-on-surface">{myAttendance.name} {myAttendance.roll && `(${myAttendance.roll})`}</p>
                <p className="mt-1 text-sm font-medium text-tertiary-container">{myAttendance.status}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{myAttendance.subject} · {myAttendance.date}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
