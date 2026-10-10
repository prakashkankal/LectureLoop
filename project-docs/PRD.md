# LectureLoop — Product Requirements Document (PRD)

**Product name:** LectureLoop  
**Document status:** Draft for implementation  
**Audience:** Product team, UI/UX designers, developers, and AI coding agents  
**Related document:** `requirement.md` (detailed functional and technical implementation requirements)

---

## 1. Product Summary

LectureLoop is a web-based adaptive learning platform that transforms lectures into topic-based, interactive study sessions. In the initial experience, a student submits a YouTube lecture URL. The platform analyzes the available transcript, divides the lecture into timestamped topics, and creates questions grounded in the content of each topic.

Students watch one topic at a time and answer a related question. If they answer incorrectly, LectureLoop directs them to the relevant video segment and provides topic-specific notes or an explanation. They can retry and then continue to the next topic. Session results show progress and topics that need revision.

The broader project vision includes recorded classroom audio, support for code-mixed Hindi/English speech where transcription quality allows, oral explanation practice, personalized mind-map notes, teacher tools, and research evaluation. These are later-phase capabilities, not prerequisites for the initial MVP.

## 2. Problem Statement

Students often consume lectures passively. They may finish a video or class without knowing which concepts they understood or missed. General summaries and full-video replay do not necessarily help them revisit the exact point of confusion.

LectureLoop aims to:
- Break a lecture into manageable, timestamped topic sections.
- Check understanding immediately after each section.
- Provide targeted remediation when a learner answers incorrectly.
- Track weak topics so students can focus their revision.
- Base questions and notes on the actual lecture content rather than unrelated or invented material.

## 3. Product Vision

Make every supported lecture a guided learning experience in which students can learn, test their understanding, revisit the relevant source, and improve topic by topic.

### Product principles

1. **Source-grounded:** Questions, explanations, and notes should be based on the lecture transcript or clearly disclose when a detail is an illustrative addition.
2. **Targeted remediation:** Revisit the relevant topic segment instead of forcing the learner to restart the entire lecture.
3. **Progress persistence:** Saved attempts and session progress should survive page reloads.
4. **Transparent AI:** Do not represent unavailable transcript or AI processing as successful.
5. **One coherent product:** The dashboard and Interactive Learning module must share a consistent application shell and design system.
6. **Incremental delivery:** Deliver the main learning loop before adding advanced features.

## 4. Goals and Success Criteria

### 4.1 MVP goals

- A student can submit a supported YouTube lecture URL.
- The system can retrieve a permitted transcript or clearly report why it cannot.
- The transcript can be segmented into ordered topics with valid timestamps.
- Each available topic has at least one validated, transcript-grounded MCQ.
- The learner can study topic segments sequentially.
- Incorrect answers trigger targeted replay and topic-specific notes or explanations.
- Attempts, topic outcomes, and session progress are persisted.
- The learner can see session results and identify weak topics.
- The UI is integrated with the existing dashboard and works on desktop and mobile.

### 4.2 Product metrics

Use these metrics only when real usage data is available:
- Lecture-analysis completion rate.
- Median time from submission to analysis completion.
- Percentage of analyzed lectures with valid topic segments and questions.
- Learning-session start and completion rates.
- First-attempt answer accuracy.
- Average attempts per question.
- Percentage of learners who revisit a weak topic.
- User-rated usefulness and clarity of generated questions/notes.
- Processing failure rate by stage.

Do not invent baseline values or claim learning improvement without an evaluation.

## 5. Target Users

### Primary user: Student

A college student who learns from recorded lectures and wants to test understanding, review difficult concepts, and prepare for assessments.

### Later user: Teacher

A teacher who may review AI-generated questions and inspect aggregate class-level weak-topic patterns.

### User needs

Students need to:
- Add a lecture without a complicated setup.
- Understand whether the lecture is still processing or ready to study.
- See clear topic names and timestamps.
- Answer questions without losing their place in the video.
- Understand why an answer was incorrect.
- Replay the exact topic and retry.
- Resume a session later.
- Find weak topics quickly after a session.

Teachers, in a later phase, need to review question quality and understand class-level learning difficulties without exposing unnecessary individual data.

## 6. Scope

### 6.1 MVP — required

1. Integrate the existing dashboard and Interactive Learning UI into one cohesive app.
2. Add a YouTube lecture using a supported URL.
3. Store lecture metadata and processing status.
4. Retrieve an available transcript using a permitted method.
5. Segment the transcript into timestamped topics.
6. Generate and validate topic-grounded MCQs.
7. Present an embedded YouTube player with topic-level playback controls.
8. Pause at topic boundaries and display the corresponding question.
9. Record answers and attempts on the server.
10. On incorrect answers, show targeted replay and topic notes/explanations.
11. Apply the configured retry policy and mark unresolved topics as weak.
12. Continue through topics and show a results page.
13. Persist and resume learning sessions.
14. Provide loading, empty, error, and recovery states.

### 6.2 Later phases

- Recorded classroom audio upload and transcription.
- Improved support for Hinglish and noisy classroom audio.
- Oral assessment using spoken answers, with content and spoken-English feedback.
- Personalized mind-map infographic notes and PDF/image export.
- Teacher question review and class-level weak-topic dashboard.
- Spaced revision reminders.
- Research evaluation of segmentation, question quality, transcription, learning gain, speaking feedback, and usability.

### 6.3 Out of scope for MVP

- Downloading or rehosting YouTube videos.
- Real-time live transcription.
- Camera-based attention monitoring.
- Full pronunciation assessment.
- Telegram integration.
- Advanced analytics unsupported by actual data.
- Claims that the system guarantees correct AI output or improves learning without evaluation.

## 7. Core User Journey

1. Student opens the LectureLoop dashboard.
2. Student selects **Interactive Learning**.
3. Student chooses **Add YouTube Lecture**.
4. Student enters a URL and optional title/subject.
5. LectureLoop validates the URL and creates a lecture record.
6. The system retrieves the transcript and analyzes it.
7. The UI displays processing status and then the topic overview.
8. Student starts or resumes a learning session.
9. The player seeks to the current topic's start time and plays that segment.
10. At the topic boundary, the player pauses and the related MCQ appears.
11. Student submits an answer.
12. If correct, the system records the answer and offers the next topic.
13. If incorrect, the system shows topic-specific notes/explanation and a replay action for that segment, then allows a retry according to the attempt policy.
14. After the maximum attempts, the system shows a simpler explanation/example where supported, marks the topic weak, records the outcome, and lets the student continue.
15. At the end, the student sees completed topics, accuracy, attempts, and weak topics.

## 8. Functional Requirements

### FR-1: Unified dashboard and navigation

The dashboard and learning module must share one application shell, consistent components, and connected navigation. Existing working UI should be reused rather than regenerated.

### FR-2: YouTube lecture creation

The user can submit a supported YouTube URL with an optional title and subject. The server validates the URL, extracts the canonical video ID, prevents accidental duplicate processing, and stores the lecture record.

### FR-3: Transcript acquisition

The system attempts transcript retrieval through a permitted method. If the transcript is unavailable, the user receives an honest, actionable error. A configured speech-to-text fallback may be used only where permitted and supported.

### FR-4: Topic segmentation

The system creates ordered topic segments with title, description, start/end timestamps, transcript content or references, and key concepts. Timestamps must be valid, ordered, and within the known video duration.

### FR-5: Question generation and validation

Generate MCQs using only the relevant segment's transcript. Validate that each question has valid options, exactly one correct answer, a grounded explanation, and supporting source evidence. Invalid questions must be retried a limited number of times or marked unavailable.

### FR-6: Segment playback

Use the official YouTube embedded player/player API. The app must seek to the current topic's start and implement/test logic that pauses at the segment's end. An ordinary iframe alone must not be assumed to enforce segment boundaries.

### FR-7: Quiz and answer recording

Display the question associated with the current topic. The server—not the browser—determines correctness. Store each attempt with session, topic, question, selected option, attempt number, outcome, and timestamp.

### FR-8: Adaptive remediation

After an incorrect answer, provide relevant replay and topic notes/explanation. Use a configurable attempt policy. The default policy is:
- First incorrect attempt: feedback, targeted replay, topic notes, retry.
- Second incorrect attempt: concise source-grounded summary, replay, retry.
- Third incorrect attempt: correct answer and simpler explanation/example, mark weak, and continue.

### FR-9: Session progress

Save current topic, completed topics, attempts, weak-topic state, and session status. Refreshing or reopening the session must not reset progress.

### FR-10: Results

Show recorded completion, accuracy, attempts, and weak topics. Metrics must be calculated from persisted data. Distinguish completed, in-progress, and abandoned sessions.

### FR-11: Error handling

Handle invalid URLs, unsupported/private/deleted videos, unavailable transcripts, provider errors, malformed AI output, network errors, unavailable embeds, and authorization failures with clear messages and safe retry behavior.

### FR-12: Future note and oral-assessment capabilities

The architecture should permit later implementation of richer notes, mind maps, audio uploads, oral responses, teacher tools, and research exports without requiring a complete rewrite.

## 9. UX and Design Requirements

### 9.1 Existing UI

Use the Stitch-generated UI as the visual baseline. Inspect the code before changing it. Preserve its design language and reuse its working components, styles, and assets.

### 9.2 Navigation

Retain existing navigation where possible and connect:
- Overview
- Interactive Learning
- My Lectures
- Subjects (if present)
- Notes (if present)
- Revision (future placeholder until functional)
- Settings

Do not create duplicate sidebars, headers, or separate visual systems.

### 9.3 Required screens

- Dashboard overview
- Interactive Learning home
- Add YouTube Lecture
- Lecture processing state
- Topic overview
- Learning session/player and quiz
- Incorrect-answer remediation and notes
- Session results
- Lecture library
- Clearly labeled future-feature placeholders where needed

### 9.4 Responsive behavior

- Desktop: video/player area and topic/question content can appear side by side when space allows.
- Mobile: use a single-column layout with player, progress, question, feedback, and notes in a clear order.
- Prevent horizontal overflow.
- Use accessible labels, keyboard navigation, visible focus states, readable contrast, and appropriately sized touch targets.
- Show real loading, empty, and error states.
- Do not show fake analytics as real data.

## 10. High-Level Technical Direction

Use the existing repository's architecture where practical. The current intended direction is:

- Frontend: React, Vite, JavaScript, Tailwind CSS, and the existing routing/component conventions.
- Backend: Node.js and Express.
- Database: MongoDB with Mongoose.
- Video: official YouTube embed and IFrame Player API.
- AI/transcription: provider-neutral backend service modules.
- Deployment: retain existing deployment configuration unless there is a documented reason to change it.

Suggested backend service boundaries:
- Transcript retrieval/transcription
- Transcript segmentation
- MCQ generation
- MCQ validation
- Topic notes generation

Do not assume any external API credentials or transcript provider is configured. Keep secrets server-side and document required environment variables.

## 11. Core Data Entities

Use the existing data model conventions where possible. Logical entities include:

- **User:** identity and role where authentication is implemented.
- **Lecture:** owner, source URL/video ID, title, subject, status, processing stage, and analysis version.
- **Transcript:** source, language, timestamped text units, and processing status.
- **TopicSegment:** lecture, order, title, description, timestamps, transcript reference, and key concepts.
- **Question:** segment association, options, correct answer, explanation, evidence, and validation status.
- **LearningSession:** owner, lecture, status, current segment, completed segments, and weak segments.
- **AnswerAttempt:** session, segment, question, selected option, server-calculated outcome, attempt number, and submission time.
- **TopicNotes:** segment association, notes content, evidence, and optional learner-specific context.

Correct answer keys must not be returned to the client before answer submission. User-owned data must be protected by server-side authorization.

## 12. Non-Functional Requirements

### Reliability
- Save attempts and progress in persistent storage.
- Recover gracefully from external provider failures.
- Avoid duplicate processing jobs and unintended duplicate answer submissions.
- Preserve prior successful processing stages when a later stage fails.

### Security and privacy
- Do not store plaintext passwords.
- Keep API keys in environment variables.
- Validate requests server-side.
- Enforce ownership checks for lectures, sessions, notes, and attempts.
- Do not download/rehost YouTube videos.
- Process classroom recordings only with appropriate permission and consent.
- Avoid camera/face data collection.
- Provide a deletion policy for stored lecture and learning data.

### Maintainability
- Reuse existing components and code conventions.
- Separate UI, business rules, persistence, and external-provider integrations.
- Centralize retry policy and validation.
- Document setup and known limitations.

### Performance
- Show immediate feedback for user actions.
- Persist long-running processing status.
- Avoid repeating expensive processing when valid results can be reused.
- Lazy-load large pages/components where useful.

## 13. Error and Recovery Expectations

| Condition | Expected product behavior |
|---|---|
| No saved lectures | Show a useful empty state and Add Lecture action |
| Invalid URL | Explain the supported URL format |
| Lecture processing | Show known processing stage and allow navigation/refresh |
| Transcript unavailable | Explain the limitation and next steps |
| AI provider missing | Report configuration is missing; do not fake success |
| AI provider failure | Preserve saved state and offer safe retry |
| Invalid question output | Retry validation a limited number of times or mark unavailable |
| Embed unavailable | Explain that playback is unavailable and offer a return path |
| Session resumed | Restore current topic and attempts |
| Session completed | Show results and weak-topic review actions |
| Unauthorized record | Return a safe not-found/permission state without exposing another user's data |

## 14. Delivery Plan

### Phase 0 — Repository audit
Inspect the project and Stitch UI. Map requirements to existing files and features. Do not edit until the analysis is complete and approved.

### Phase 1 — UI integration
Unify the dashboard and Interactive Learning module using the existing design. Connect navigation and fix responsive/layout inconsistencies without redesigning everything.

### Phase 2 — Lecture persistence
Implement lecture creation, listing, details, URL validation, processing status, and database persistence.

### Phase 3 — Transcript and analysis pipeline
Implement permitted transcript retrieval, topic segmentation, question generation, validation, and processing recovery.

### Phase 4 — Interactive learning
Implement player segment control, quiz submission, server-side answer validation, retries, remediation, notes, session persistence, and continuation.

### Phase 5 — Results and quality
Implement results and weak-topic review. Test error states, ownership, resume behavior, duplicate requests, and mobile UI. Document setup and limitations.

### Later phases
Add classroom audio, oral assessment, personalized mind maps, teacher tools, spaced revision, and research evaluation.

## 15. Acceptance Criteria

The MVP is ready when:
- The dashboard and Interactive Learning module form one consistent app.
- A valid YouTube URL can be saved and processed when required services are configured.
- Unsupported URLs and unavailable transcripts are handled honestly.
- Successful analysis produces valid timestamped topic segments and validated questions.
- The learner can watch a segment and receive its corresponding question.
- Playback boundary behavior is implemented and tested.
- The server checks answers and persists attempts.
- Incorrect answers provide targeted replay and topic-specific notes/explanation.
- The attempt policy works consistently across refreshes.
- Correct or exhausted attempts allow progression to the next topic.
- Session progress and results persist.
- Weak topics are visible and can be revisited.
- Authorization prevents access to another user's private records.
- The app is usable on desktop and mobile.
- Build/tests pass and setup instructions are documented.

## 16. Product Risks and Limitations

- Transcript availability and quality vary across YouTube videos.
- Code-mixed speech and noisy recordings may reduce transcription accuracy.
- AI-generated questions and explanations can contain errors, so validation is required.
- YouTube playback controls and segment-boundary detection must be tested against real embeds.
- External provider latency, quotas, and costs may affect processing.
- Learning improvement cannot be claimed without a suitable evaluation.

## 17. Definition of Done

A feature is done when it works through the relevant UI and backend, persists required data, handles loading and error states, follows the existing design system, enforces security rules, has been tested, and is documented.

**Primary product priority:** Deliver the complete core loop first:

**Analyze lecture → segment topics → watch topic → answer question → remediate if incorrect → continue → review results.**
