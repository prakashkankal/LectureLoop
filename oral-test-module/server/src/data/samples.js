export const sampleMaterials = [
  {
    id: 'dbms-normalization',
    subject: 'Database Systems',
    lecture: 'Relational normalization',
    topic: 'Functional dependencies and normal forms',
    notes: `A functional dependency X -> Y means that the value of attribute set X determines the value of attribute set Y in a relation. A candidate key is a minimal set of attributes that uniquely identifies each row. A superkey also uniquely identifies each row, but it may contain extra attributes. First normal form requires each cell to contain an atomic value and each record to be identifiable. Second normal form requires first normal form and removes partial dependencies of non-key attributes on part of a composite candidate key. Third normal form requires second normal form and removes transitive dependencies of non-key attributes on a key. Boyce-Codd normal form requires every determinant to be a candidate key. Normalization can reduce update, insertion, and deletion anomalies, although practical designs may sometimes denormalize for performance.`,
    keyTerms: ['functional dependency', 'candidate key', 'superkey', '1NF', '2NF', '3NF', 'BCNF', 'partial dependency', 'transitive dependency', 'anomaly', 'denormalization'],
  },
  {
    id: 'operating-systems-scheduling',
    subject: 'Operating Systems',
    lecture: 'CPU scheduling fundamentals',
    topic: 'Scheduling criteria and algorithms',
    notes: `CPU scheduling chooses a ready process to run on the processor. Turnaround time is completion time minus arrival time. Waiting time is the total time a process spends in the ready queue. Response time is the time from arrival until the process first receives the CPU. First-Come, First-Served (FCFS) runs processes in arrival order and is non-preemptive. Shortest Job First (SJF) selects the process with the smallest next CPU burst and can minimize average waiting time when burst lengths are known, but long jobs may starve. Round Robin assigns each process a time quantum and preempts it when the quantum expires. A very large quantum makes Round Robin behave like FCFS; an excessively small quantum increases context-switch overhead.`,
    keyTerms: ['CPU scheduling', 'turnaround time', 'waiting time', 'response time', 'FCFS', 'SJF', 'Round Robin', 'time quantum', 'preemption', 'starvation', 'context switch'],
  },
];