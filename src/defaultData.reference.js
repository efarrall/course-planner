// DEFAULT DATA - FOR REFERENCE ONLY
// This file contains sample data that was used in early development.
// The app now starts empty if no save files exist.
// You can use this as a template for creating new courses/degrees.

export const defaultCourses = [
  { id: '1', code: 'STAT 415', title: 'Intro Math Stat', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'A theoretical treatment of statistical inference, including sufficiency, estimation, testing, regression, analysis of variance, and chi-square tests.', assignedDegrees: [] },
  { id: '2', code: 'STAT 380', title: 'Stat Data Science', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'A case study-based course in the use of computing and statistical reasoning to answer data-intensive questions.', assignedDegrees: [] },
  { id: '3', code: 'STAT 300', title: 'Stat Modeling I', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'This course is designed to serve as a bridge between introductory statistics and more advanced applied statistics courses.', assignedDegrees: [] },
  { id: '4', code: 'MATH 441', title: 'Matrix Algebra', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'Determinants, matrices, linear equations, characteristic roots, quadratic forms, vector spaces.', assignedDegrees: [] },
  { id: '5', code: 'DS 330', title: 'Visual Analytics', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'The course introduces visual analytics methods and techniques that are designed to support human analytical reasoning with data.', assignedDegrees: [] },
  { id: '6', code: 'AA 120N', title: 'Intro Art Therapy', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'Introduction to Art Therapy is designed to introduce undergraduates to the philosophical, pragmatic and historical bases of the human service field of art therapy.', assignedDegrees: [] },
  { id: '7', code: 'STAT 506', title: 'Sampling Theory', credits: 3, level: 'Graduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: ['Spring'], semesterRestrictionsOnline: [], description: 'Theory and application of sampling from finite populations.', assignedDegrees: [] },
  { id: '8', code: 'STAT 502', title: 'Analysis of Variance', credits: 3, level: 'Graduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: ['Spring', 'Summer'], semesterRestrictionsOnline: [], description: 'Analysis of variance and design concepts; factorial, nested, and unbalanced data; ANCOVA; blocked designs.', assignedDegrees: [] },
  { id: '9', code: 'DS 435', title: 'Data Ethics', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'This course explores social and ethical dimensions of data science.', assignedDegrees: [] },
  { id: '10', code: 'CMPSC 448', title: 'Machine Learning', credits: 3, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'Evaluation and use of machine learning models; algorithmic elements of artificial intelligence.', assignedDegrees: [] },
  { id: '11', code: 'STAT 480', title: 'Intro to SAS', credits: 1, level: 'Undergraduate', prerequisites: { type: 'and', groups: [] }, deliveryMode: 'In-Person', semesterRestrictionsInPerson: [], semesterRestrictionsOnline: [], description: 'Introduction to SAS with emphasis on reading, manipulating and summarizing data.', assignedDegrees: [] },
];

export const defaultPlacements = {
  'Fall 2025': ['1', '2', '3', '4', '5', '6'],
  'Spring 2026': ['7', '8', '9', '10', '11'],
  'Fall 2026': [],
  'Spring 2027': [],
  'pool': []
};

export const defaultDegrees = [
  { id: '1', name: 'Bachelor of Science - Statistics', type: 'Bachelor', requiredCredits: 120 },
  { id: '2', name: 'Bachelor of Science - Data Science', type: 'Bachelor', requiredCredits: 120 },
  { id: '3', name: 'Master of Applied Statistics', type: 'Master', requiredCredits: 30 },
];
