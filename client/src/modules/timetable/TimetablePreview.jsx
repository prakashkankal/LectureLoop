import React from 'react';

const columns = [
  ['day', 'Day'],
  ['start_time', 'Start'],
  ['end_time', 'End'],
  ['subject', 'Subject'],
  ['class_name', 'Class'],
  ['room_no', 'Room'],
  ['device_id', 'Device'],
];

export default function TimetablePreview({ rows, onConfirm, isUploading }) {
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-space-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Preview timetable</h2>
        <p className="text-sm text-on-surface-variant">{rows.length} timetable entries found.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-outline-variant/30">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              {columns.map(([, label]) => (
                <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.device_id}-${row.day}-${row.start_time}-${index}`} className="border-t border-outline-variant/20">
                {columns.map(([key]) => (
                  <td key={key} className="whitespace-nowrap px-4 py-3 text-on-surface">{row[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isUploading}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-primary-container px-space-lg py-3 text-sm font-medium text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? 'Uploading timetable...' : 'Confirm and upload'}
      </button>
    </section>
  );
}
