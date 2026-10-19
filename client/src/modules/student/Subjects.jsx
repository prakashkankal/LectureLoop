import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_SUBJECTS = [
  {
    _id: 'sub_dbms_1',
    code: 'CS-301',
    title: 'Database Management Systems (DBMS)',
    instructor: 'Prof. Aris Thorne',
    term: 'Fall 2024',
    icon: 'database',
    color: 'primary',
    coverage: 68,
    lectureCount: 4,
    totalHours: '3.2 Hours',
    statusNote: 'Vector indexing up to date',
  },
  {
    _id: 'sub_os_2',
    code: 'CS-302',
    title: 'Operating Systems (OS)',
    instructor: 'Dr. Elena Rostova',
    term: 'Fall 2024',
    icon: 'memory',
    color: 'secondary',
    coverage: 52,
    lectureCount: 3,
    totalHours: '2.6 Hours',
    statusNote: '1 sync scheduled',
  },
  {
    _id: 'sub_cn_3',
    code: 'CS-404',
    title: 'Computer Networks',
    instructor: 'Prof. Kenneth Wu',
    term: 'Fall 2024',
    icon: 'hub',
    color: 'primary',
    coverage: 44,
    lectureCount: 3,
    totalHours: '2.1 Hours',
    statusNote: 'All flashcards generated',
  },
  {
    _id: 'sub_dsa_4',
    code: 'CS-202',
    title: 'Data Structures & Algorithms',
    instructor: 'Dr. Marcus Vance',
    term: 'Fall 2024',
    icon: 'account_tree',
    color: 'tertiary',
    coverage: 31,
    lectureCount: 2,
    totalHours: '1.8 Hours',
    statusNote: '2 quizzes pending',
  },
];

export default function SubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);
  const [isNewSubjectOpen, setIsNewSubjectOpen] = useState(false);

  // Add Lecture form state
  const [lectureTitle, setLectureTitle] = useState('Relational Normalization and BCNF');
  const [lectureSubject, setLectureSubject] = useState('');
  const [lectureDate, setLectureDate] = useState('2024-10-24');
  const [lectureNotes, setLectureNotes] = useState('Covered 1NF, 2NF, 3NF and Boyce-Codd normal forms with classroom examples.');
  const [sourceType, setSourceType] = useState('audio'); // 'audio' or 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=ztHopE5Wnpc');
  const [selectedFileName, setSelectedFileName] = useState('lecture_dbms_oct24.mp3');
  const [isSubmittingLecture, setIsSubmittingLecture] = useState(false);

  // New Subject form state
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubInstructor, setNewSubInstructor] = useState('');
  const [newSubTerm, setNewSubTerm] = useState('Fall 2024');
  const [newSubIcon, setNewSubIcon] = useState('menu_book');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Load subjects from API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/subjects`);
        if (res.data?.success && res.data?.data?.length > 0) {
          setSubjects(res.data.data);
          if (!lectureSubject) {
            setLectureSubject(res.data.data[0].code);
          }
        } else {
          setLectureSubject('CS-301');
        }
      } catch (err) {
        console.warn('Could not load subjects from API, using default items.', err);
        setLectureSubject('CS-301');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute analytics
  const totalCourses = subjects.length;
  const totalLectures = subjects.reduce((acc, s) => acc + (s.lectureCount || 0), 0);
  const totalHours = '9.7 Hours';

  // Helper for card styling
  const getColorClasses = (color) => {
    switch (color) {
      case 'secondary':
        return {
          iconBg: 'bg-secondary-fixed text-secondary',
          badgeText: 'text-secondary',
          progressBg: 'bg-secondary-container',
        };
      case 'tertiary':
        return {
          iconBg: 'bg-tertiary-fixed text-tertiary',
          badgeText: 'text-tertiary',
          progressBg: 'bg-tertiary-container',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-primary-container/10 text-primary-container',
          badgeText: 'text-primary',
          progressBg: 'bg-primary-container',
        };
    }
  };

  // Handle Save Lecture
  const handleSaveLecture = async (e) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      showToast('Please provide a lecture title.');
      return;
    }
    setIsSubmittingLecture(true);

    try {
      const payload = {
        title: lectureTitle,
        subject: lectureSubject || 'CS-301',
        description: lectureNotes,
        youtubeUrl: sourceType === 'youtube' ? youtubeUrl : '',
        duration: '42:15',
      };

      await axios.post(`${API_BASE}/lectures`, payload);

      // Increment lecture count for the matched subject in local state
      setSubjects((prev) =>
        prev.map((sub) =>
          sub.code === lectureSubject || sub.title.includes(lectureSubject)
            ? { ...sub, lectureCount: (sub.lectureCount || 0) + 1 }
            : sub
        )
      );

      setIsAddLectureOpen(false);
      showToast(`Lecture "${lectureTitle}" added successfully!`);
    } catch (err) {
      console.warn('Error saving lecture, applying optimistic update:', err);
      // Optimistic fallback
      setSubjects((prev) =>
        prev.map((sub) =>
          sub.code === lectureSubject || sub.title.includes(lectureSubject)
            ? { ...sub, lectureCount: (sub.lectureCount || 0) + 1 }
            : sub
        )
      );
      setIsAddLectureOpen(false);
      showToast(`Lecture "${lectureTitle}" saved!`);
    } finally {
      setIsSubmittingLecture(false);
    }
  };

  // Handle Create Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubCode.trim() || !newSubTitle.trim()) {
      showToast('Course code and title are required.');
      return;
    }
    setIsSubmittingSubject(true);

    try {
      const payload = {
        code: newSubCode.trim().toUpperCase(),
        title: newSubTitle.trim(),
        instructor: newSubInstructor.trim() || 'Staff Instructor',
        term: newSubTerm.trim() || 'Fall 2024',
        icon: newSubIcon || 'menu_book',
        color: 'primary',
      };

      const res = await axios.post(`${API_BASE}/subjects`, payload);
      const created = res.data?.data || {
        ...payload,
        _id: `sub_${Date.now()}`,
        coverage: 0,
        lectureCount: 0,
        totalHours: '0.0 Hours',
        statusNote: 'New course track initialized',
      };

      setSubjects((prev) => [created, ...prev]);
      setIsNewSubjectOpen(false);
      setNewSubCode('');
      setNewSubTitle('');
      setNewSubInstructor('');
      showToast(`Course "${created.code}" created successfully!`);
    } catch (err) {
      console.warn('Error creating subject, falling back to local state:', err);
      const fallbackSubject = {
        _id: `sub_${Date.now()}`,
        code: newSubCode.trim().toUpperCase(),
        title: newSubTitle.trim(),
        instructor: newSubInstructor.trim() || 'Staff Instructor',
        term: newSubTerm.trim() || 'Fall 2024',
        icon: newSubIcon || 'menu_book',
        color: 'primary',
        coverage: 0,
        lectureCount: 0,
        totalHours: '0.0 Hours',
        statusNote: 'New course track initialized',
      };
      setSubjects((prev) => [fallbackSubject, ...prev]);
      setIsNewSubjectOpen(false);
      setNewSubCode('');
      setNewSubTitle('');
      setNewSubInstructor('');
      showToast(`Course "${fallbackSubject.code}" added!`);
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-space-sm bg-inverse-surface text-inverse-on-surface px-space-lg py-space-md rounded-xl shadow-2xl border border-outline-variant/30 animate-bounce">
          <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">check_circle</span>
          <span className="font-label-md text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="px-gutter py-space-xl flex flex-col gap-space-xl max-w-7xl mx-auto w-full">
        {/* Header Section with Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-outline tracking-wider uppercase">
              <span>Overview</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-medium">Subjects & Curriculum</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Subjects Management
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Group your lecture recordings by course, track lecture counts, and organize your academic semester.
            </p>
          </div>

          {/* Action Cluster */}
          <div className="flex items-center gap-space-md shrink-0">
            <button
              id="btn-open-new-subject"
              type="button"
              onClick={() => setIsNewSubjectOpen(true)}
              className="h-10 px-space-lg rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors shadow-sm flex items-center gap-space-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Subject</span>
            </button>
            <button
              id="btn-open-upload-modal"
              type="button"
              onClick={() => setIsAddLectureOpen(true)}
              className="h-10 px-space-lg rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-md flex items-center gap-space-xs cursor-pointer hover:shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Upload Lecture</span>
            </button>
          </div>
        </div>

        {/* Analytics / Semester Snapshot Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between border border-outline-variant/20">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Active Courses</span>
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {totalCourses} Subjects
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between border border-outline-variant/20">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Total Recorded</span>
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {totalLectures} Lectures
              </span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between border border-outline-variant/20">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Audio Material</span>
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">{totalHours}</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[24px]">timelapse</span>
            </div>
          </div>

          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between border border-outline-variant/20">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Current Term</span>
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">Fall 2024</span>
            </div>
            <div className="w-11 h-11 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[24px]">event_repeat</span>
            </div>
          </div>
        </div>

        {/* Subjects Management Grid */}
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-title-md text-title-md text-on-surface font-semibold">Enrolled Course Tracks</h2>
            <div className="flex items-center gap-space-xs text-body-sm font-body-sm text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span>Semester Sync Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {subjects.map((sub) => {
              const styles = getColorClasses(sub.color);
              return (
                <div
                  key={sub._id || sub.code}
                  className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group border border-outline-variant/20"
                >
                  <div className="flex flex-col gap-space-md">
                    {/* Card Top Title & Code */}
                    <div className="flex items-start justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center shrink-0`}>
                          <span className="material-symbols-outlined text-[22px]">{sub.icon || 'menu_book'}</span>
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className={`font-label-sm text-label-sm ${styles.badgeText} font-semibold tracking-wide`}>
                            {sub.code}
                          </span>
                          <h3 className="font-title-md text-title-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                            {sub.title}
                          </h3>
                        </div>
                      </div>
                      <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm shrink-0">
                        {sub.term || 'Fall 2024'}
                      </span>
                    </div>

                    {/* Meta information */}
                    <div className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-body-sm font-body-sm text-on-surface-variant">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-[16px] text-outline">record_voice_over</span>
                        <span>{sub.instructor}</span>
                      </div>
                      <span className="text-outline">·</span>
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-[16px] text-outline">audio_file</span>
                        <span>{sub.lectureCount || 0} Recorded Lectures</span>
                      </div>
                      <span className="text-outline">·</span>
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                        <span>{sub.totalHours || '1.5 Hours Total'}</span>
                      </div>
                    </div>

                    {/* Course Progress Bar & Coverage */}
                    <div className="flex flex-col gap-space-xs pt-space-xs">
                      <div className="flex justify-between items-center text-label-sm font-label-sm">
                        <span className="text-on-surface-variant">Syllabus Loop Coverage</span>
                        <span className={`${styles.badgeText} font-semibold`}>{sub.coverage || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className={`h-full ${styles.progressBg} rounded-full transition-all duration-500`}
                          style={{ width: `${sub.coverage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-space-lg pt-space-md flex items-center justify-between border-t border-surface-container-high/40">
                    <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-outline">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                      <span>{sub.statusNote || 'Vector indexing up to date'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/lectures')}
                      className="px-space-md py-space-sm rounded-lg bg-surface-container text-primary font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-space-xs cursor-pointer"
                    >
                      <span>View Lectures ({sub.lectureCount || 0})</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Workflow Banner / Local Sync Status */}
        <div className="p-space-lg rounded-xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-space-md border border-outline-variant/30">
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">sync</span>
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-on-surface font-medium">
                Automatic Adaptive Recall Scheduler
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Lectures uploaded today will be scheduled for active spaced reviews across a 1-day, 3-day, and 7-day loop.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <span className="px-space-md py-space-xs rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm font-medium shadow-sm">
              4 Lectures Due This Week
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Upload / Add Lecture Modal                                       */}
      {/* ========================================================================= */}
      {isAddLectureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-outline-variant/30">
            {/* Modal Header */}
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between gap-space-md border-b border-surface-container-high/40">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">library_add</span>
                  <span>Upload Pipeline</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Add a Lecture</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Keep your classroom lectures organized in one place.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsAddLectureOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveLecture} className="p-space-lg overflow-y-auto flex flex-col gap-space-lg">
              {/* Lecture Title */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between">
                  <span>
                    Lecture Title <span className="text-error">*</span>
                  </span>
                  <span className="text-outline text-label-sm font-label-sm">Primary topic identifier</span>
                </label>
                <input
                  required
                  type="text"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="e.g., Relational Normalization and BCNF"
                  className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                />
              </div>

              {/* Subject & Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Subject <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={lectureSubject}
                      onChange={(e) => setLectureSubject(e.target.value)}
                      className="w-full h-10 pl-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all appearance-none cursor-pointer"
                    >
                      {subjects.map((s) => (
                        <option key={s._id || s.code} value={s.code}>
                          {s.title} ({s.code})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline pointer-events-none text-[20px]">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Lecture Date <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={lectureDate}
                      onChange={(e) => setLectureDate(e.target.value)}
                      className="w-full h-10 pl-space-md pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all cursor-pointer"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline pointer-events-none text-[18px]">
                      calendar_today
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Mode Toggle: Audio vs YouTube */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium">
                  Source Material Type <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-2 gap-space-sm p-1 bg-surface-container-low rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSourceType('audio')}
                    className={`py-2 rounded-md font-label-md text-sm flex items-center justify-center gap-space-xs transition-all ${
                      sourceType === 'audio'
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">mic_none</span>
                    <span>Audio / Classroom Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('youtube')}
                    className={`py-2 rounded-md font-label-md text-sm flex items-center justify-center gap-space-xs transition-all ${
                      sourceType === 'youtube'
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">smart_display</span>
                    <span>YouTube Video URL</span>
                  </button>
                </div>
              </div>

              {/* Dynamic input based on mode */}
              {sourceType === 'youtube' ? (
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">YouTube Lecture Link</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-red-500 text-[20px]">
                      play_circle
                    </span>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full h-10 pl-10 pr-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Audio / Media Recording <span className="text-error">*</span>
                  </label>
                  <div className="p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-space-xs relative border border-dashed border-outline-variant/60">
                    <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center mb-1">
                      <span className="material-symbols-outlined text-[26px]">mic_none</span>
                    </div>
                    <div className="font-label-md text-label-md text-on-surface font-medium">
                      Drop your lecture audio here, or <span className="text-primary hover:underline">Browse files</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-outline">
                      Supported formats: MP3, M4A, WAV, AAC (up to 200MB)
                    </p>
                    <input
                      type="file"
                      accept=".mp3,.m4a,.wav,.aac"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setSelectedFileName(e.target.files[0].name);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Selected File Preview Badge */}
                  {selectedFileName && (
                    <div className="mt-space-xs p-space-md rounded-lg bg-surface-container flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">audiotrack</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                            {selectedFileName}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            42.4 MB • <span className="text-tertiary font-medium">Ready to save</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFileName('')}
                        title="Remove file"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Professor Notes / Key Topics */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between">
                  <span>Professor Notes / Key Topics</span>
                  <span className="text-outline text-label-sm font-label-sm">Optional context for AI</span>
                </label>
                <textarea
                  rows="3"
                  value={lectureNotes}
                  onChange={(e) => setLectureNotes(e.target.value)}
                  placeholder="Covered 1NF, 2NF, 3NF and Boyce-Codd normal forms with classroom examples."
                  className="p-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all resize-none"
                ></textarea>
              </div>

              {/* Modal Footer */}
              <div className="pt-space-md border-t border-surface-container-high/40 flex flex-col gap-space-sm">
                <div className="flex items-center justify-end gap-space-md">
                  <button
                    type="button"
                    onClick={() => setIsAddLectureOpen(false)}
                    className="h-10 px-space-lg rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLecture}
                    className="h-10 px-space-xl rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-md flex items-center gap-space-xs cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>{isSubmittingLecture ? 'Saving...' : 'Save Lecture'}</span>
                  </button>
                </div>
                <p className="font-body-sm text-body-sm text-outline text-center sm:text-left">
                  Saved lectures are automatically sent to the AI processing pipeline for transcription and quiz generation.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: New Subject Modal                                                */}
      {/* ========================================================================= */}
      {isNewSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30">
            {/* Modal Header */}
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between gap-space-md border-b border-surface-container-high/40">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">folder_special</span>
                  <span>Curriculum Track</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">New Subject Track</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Enroll a new course module into your semester workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSubjectOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubject} className="p-space-lg flex flex-col gap-space-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Course Code <span className="text-error">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="e.g., CS-305"
                    className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium">Term / Semester</label>
                  <input
                    type="text"
                    value={newSubTerm}
                    onChange={(e) => setNewSubTerm(e.target.value)}
                    placeholder="Fall 2024"
                    className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium">
                  Course Title <span className="text-error">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  placeholder="e.g., Software Engineering & System Design"
                  className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                />
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium">Instructor / Professor</label>
                <input
                  type="text"
                  value={newSubInstructor}
                  onChange={(e) => setNewSubInstructor(e.target.value)}
                  placeholder="e.g., Dr. Alan Turing"
                  className="h-10 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                />
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium">Course Icon</label>
                <div className="flex items-center gap-space-sm">
                  {['menu_book', 'database', 'memory', 'hub', 'account_tree', 'code', 'science'].map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setNewSubIcon(ic)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        newSubIcon === ic
                          ? 'bg-primary-container text-on-primary ring-2 ring-primary-container'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-space-md border-t border-surface-container-high/40 flex items-center justify-end gap-space-md mt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSubjectOpen(false)}
                  className="h-10 px-space-lg rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSubject}
                  className="h-10 px-space-xl rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-md flex items-center gap-space-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>{isSubmittingSubject ? 'Creating...' : 'Create Course Track'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
