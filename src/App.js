import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, AlertCircle, Edit2 } from 'lucide-react';

const CoursePlanner = () => {
  const [courses, setCourses] = useState([]);
  const [placements, setPlacements] = useState({});
  const [degrees, setDegrees] = useState([]);
  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDegreeForm, setShowDegreeForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingDegree, setEditingDegree] = useState(null);
  const [draggedCourse, setDraggedCourse] = useState(null);

  const semesters = ['Fall 2025', 'Spring 2026', 'Fall 2026', 'Spring 2027'];

  // Migrate old course format to new format
  const migrateCourse = (course) => {
    const migrated = { ...course };

    // Migrate prerequisites from array to new object format
    if (Array.isArray(course.prerequisites)) {
      migrated.prerequisites = { type: 'and', groups: [] };
    }

    // Add assignedDegrees if missing
    if (!migrated.assignedDegrees) {
      migrated.assignedDegrees = [];
    }

    // Migrate to delivery mode format
    if (!migrated.deliveryMode) {
      migrated.deliveryMode = 'In-Person';
      // Migrate old semesterRestrictions to semesterRestrictionsInPerson
      migrated.semesterRestrictionsInPerson = migrated.semesterRestrictions || [];
      migrated.semesterRestrictionsOnline = [];
      delete migrated.semesterRestrictions;
    }

    return migrated;
  };

  // Load data from Electron save files on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load the latest save file using Electron IPC
        const result = await window.electron.loadLatestData();

        if (result.success) {
          const parsedData = JSON.parse(result.data);

          // Migrate courses if needed
          const migratedCourses = parsedData.courses.map(migrateCourse);
          setCourses(migratedCourses);
          setPlacements(parsedData.placements);
          setDegrees(parsedData.degrees || []);
          setNotes(parsedData.notes || '');

          console.log('Loaded data from save file');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        // No save files - start with empty data
        console.log('No save files found, starting empty:', error.message);

        setCourses([]);
        setPlacements({
          'Fall 2025': [],
          'Spring 2026': [],
          'Fall 2026': [],
          'Spring 2027': [],
          'pool': []
        });
        setDegrees([]);
        setNotes('');
      }
    };

    loadData();
  }, []);

  // Auto-save to Electron file system whenever data changes
  const saveData = useCallback(async () => {
    try {
      const exportData = {
        courses,
        placements,
        degrees,
        notes,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const result = await window.electron.saveData(dataStr);

      if (result.success) {
        console.log('Auto-saved to:', result.path);
      } else {
        console.error('Auto-save failed:', result.error);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [courses, placements, degrees, notes]);

  // Debounced auto-save (wait 2 seconds after last change)
  useEffect(() => {
    // Skip auto-save on initial empty state
    if (courses.length === 0 && degrees.length === 0 && notes === '' &&
        Object.values(placements).every(arr => arr.length === 0)) {
      return;
    }

    const timer = setTimeout(() => {
      saveData();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [courses, placements, degrees, notes, saveData]);

  // Helper: Get all course IDs from prerequisite groups
  const getAllPrereqCourseIds = (prerequisites) => {
    if (!prerequisites || !prerequisites.groups) return [];
    const ids = [];
    prerequisites.groups.forEach(group => {
      if (group.type === 'course') {
        ids.push(...group.courses);
      }
    });
    return ids;
  };

  const calculateTreeDepth = (courseId, visited = new Set()) => {
    if (visited.has(courseId)) return 0;
    visited.add(courseId);

    const course = courses.find(c => c.id === courseId);
    if (!course || !course.prerequisites || course.prerequisites.groups.length === 0) return 1;

    const prereqIds = getAllPrereqCourseIds(course.prerequisites);
    if (prereqIds.length === 0) return 1;

    const depths = prereqIds.map(prereqId =>
      calculateTreeDepth(prereqId, new Set(visited))
    );

    return Math.max(...depths) + 1;
  };

  // Check if a prerequisite group is satisfied
  const isPrereqGroupSatisfied = (group, semesterIndex, semesterOrder) => {
    if (group.type === 'course') {
      // OR group: at least one course must be scheduled before current semester
      return group.courses.some(prereqId => {
        const prereqPlacement = Object.entries(placements).find(([_, ids]) =>
          ids.includes(prereqId)
        );
        if (!prereqPlacement || prereqPlacement[0] === 'pool') return false;
        const prereqSemesterIndex = semesterOrder.indexOf(prereqPlacement[0]);
        return prereqSemesterIndex < semesterIndex;
      });
    } else if (group.type === 'pattern') {
      // Pattern group: count scheduled courses matching pattern
      let matchCount = 0;

      Object.entries(placements).forEach(([sem, ids]) => {
        if (sem === 'pool') return;
        const semIdx = semesterOrder.indexOf(sem);
        if (semIdx >= semesterIndex) return; // Only count courses before current semester

        ids.forEach(cId => {
          const c = courses.find(course => course.id === cId);
          if (!c) return;

          const match = c.code.match(/^([A-Z]+)\s+(\d)(\d{2})$/);
          if (!match) return;

          const dept = match[1];
          const level = match[2];

          // Check if course matches pattern
          let matches = true;
          if (group.department && dept !== group.department) matches = false;
          if (group.level && level !== group.level) matches = false;

          if (matches) matchCount++;
        });
      });

      return matchCount >= group.count;
    }
    return false;
  };

  const getViolations = () => {
    const violations = [];
    const semesterOrder = ['Fall 2025', 'Spring 2026', 'Fall 2026', 'Spring 2027'];

    Object.entries(placements).forEach(([semester, courseIds]) => {
      if (semester === 'pool') return;

      const semesterIndex = semesterOrder.indexOf(semester);

      courseIds.forEach(courseId => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        // Check prerequisites (all groups must be satisfied for AND logic)
        if (course.prerequisites && course.prerequisites.groups.length > 0) {
          const allGroupsSatisfied = course.prerequisites.groups.every(group =>
            isPrereqGroupSatisfied(group, semesterIndex, semesterOrder)
          );

          if (!allGroupsSatisfied) {
            violations.push(`${course.code}: Prerequisites not satisfied`);
          }
        }

        // Check semester restrictions based on delivery mode
        const semesterType = semester.split(' ')[0];
        const inPersonRestrictions = course.semesterRestrictionsInPerson || [];
        const onlineRestrictions = course.semesterRestrictionsOnline || [];

        if (course.deliveryMode === 'In-Person' && inPersonRestrictions.length > 0) {
          if (!inPersonRestrictions.includes(semesterType)) {
            violations.push(`${course.code}: Semester restriction violated (In-Person only offered in ${inPersonRestrictions.join(', ')})`);
          }
        } else if (course.deliveryMode === 'Online' && onlineRestrictions.length > 0) {
          if (!onlineRestrictions.includes(semesterType)) {
            violations.push(`${course.code}: Semester restriction violated (Online only offered in ${onlineRestrictions.join(', ')})`);
          }
        } else if (course.deliveryMode === 'Both') {
          // For "Both", check if it's available in either mode
          const availableInPerson = inPersonRestrictions.length === 0 || inPersonRestrictions.includes(semesterType);
          const availableOnline = onlineRestrictions.length === 0 || onlineRestrictions.includes(semesterType);

          if (!availableInPerson && !availableOnline) {
            violations.push(`${course.code}: Semester restriction violated (not offered in ${semesterType})`);
          }
        }
      });
    });

    return violations;
  };

  const getSemesterCredits = (semester) => {
    const undergrad = placements[semester]?.reduce((total, courseId) => {
      const course = courses.find(c => c.id === courseId);
      return total + (course?.level === 'Undergraduate' ? course.credits : 0);
    }, 0) || 0;

    const grad = placements[semester]?.reduce((total, courseId) => {
      const course = courses.find(c => c.id === courseId);
      return total + (course?.level === 'Graduate' ? course.credits : 0);
    }, 0) || 0;

    return { undergrad, grad, total: undergrad + grad };
  };

  const getDegreeProgress = (degreeId) => {
    let totalCredits = 0;

    // Sum credits from all scheduled courses assigned to this degree
    Object.entries(placements).forEach(([semester, courseIds]) => {
      if (semester === 'pool') return; // Don't count unscheduled courses

      courseIds.forEach(courseId => {
        const course = courses.find(c => c.id === courseId);
        if (course && course.assignedDegrees && course.assignedDegrees.includes(degreeId)) {
          totalCredits += course.credits;
        }
      });
    });

    return totalCredits;
  };

  const handleDragStart = (e, courseId) => {
    console.log('Drag started:', courseId);
    setDraggedCourse(courseId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', courseId); // Required for Tauri
    e.dataTransfer.setData('application/json', JSON.stringify({ courseId }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    console.log('Drag ended');
    e.preventDefault();
  };

  const handleDrop = (e, targetSemester) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event:', targetSemester, 'dragged:', draggedCourse);
    if (!draggedCourse) return;

    const newPlacements = { ...placements };
    
    Object.keys(newPlacements).forEach(sem => {
      newPlacements[sem] = newPlacements[sem].filter(id => id !== draggedCourse);
    });

    if (!newPlacements[targetSemester]) {
      newPlacements[targetSemester] = [];
    }
    newPlacements[targetSemester].push(draggedCourse);

    setPlacements(newPlacements);
    setDraggedCourse(null);
  };

  const handleAddCourse = (courseData) => {
    if (editingCourse) {
      setCourses(courses.map(c => c.id === editingCourse.id ? { ...courseData, id: editingCourse.id } : c));
      setEditingCourse(null);
    } else {
      const newCourse = { ...courseData, id: Date.now().toString() };
      setCourses([...courses, newCourse]);
      setPlacements({ ...placements, pool: [...(placements.pool || []), newCourse.id] });
    }
    setShowForm(false);
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      setCourses(courses.filter(c => c.id !== courseId));
      const newPlacements = { ...placements };
      Object.keys(newPlacements).forEach(sem => {
        newPlacements[sem] = newPlacements[sem].filter(id => id !== courseId);
      });
      setPlacements(newPlacements);
      setSelectedCourse(null);
    }
  };

  const handleAddDegree = (degreeData) => {
    // Check if degreeData has an id (editing) or not (new degree)
    if (degreeData.id) {
      // Editing existing degree
      setDegrees(degrees.map(d => d.id === degreeData.id ? degreeData : d));
    } else {
      // Adding new degree
      const newDegree = { ...degreeData, id: Date.now().toString() };
      setDegrees([...degrees, newDegree]);
    }
    setShowDegreeForm(false);
    setEditingDegree(null);
  };

  const handleDeleteDegree = (degreeId) => {
    if (window.confirm('Are you sure you want to delete this degree? Course assignments to this degree will be removed.')) {
      setDegrees(degrees.filter(d => d.id !== degreeId));
      // Remove degree assignments from courses
      setCourses(courses.map(c => ({
        ...c,
        assignedDegrees: c.assignedDegrees?.filter(id => id !== degreeId) || []
      })));
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        courses,
        placements,
        degrees,
        notes,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const result = await window.electron.exportData(dataStr);

      if (result.success) {
        alert(`Data exported successfully to:\n${result.path}`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleImportData = async () => {
    try {
      const result = await window.electron.importData();

      if (!result.success) {
        if (result.error !== 'No file selected') {
          alert(`Import failed: ${result.error}`);
        }
        return;
      }

      const importedData = JSON.parse(result.data);

      // Validate the imported data
      if (!importedData.courses || !importedData.placements || !importedData.degrees) {
        alert('Invalid backup file format');
        return;
      }

      // Migrate imported courses if needed
      const migratedCourses = importedData.courses.map(migrateCourse);

      if (window.confirm('This will replace all current data. Are you sure you want to continue?')) {
        setCourses(migratedCourses);
        setPlacements(importedData.placements);
        setDegrees(importedData.degrees);
        setNotes(importedData.notes || '');
        alert('Data imported successfully!');
      }
    } catch (error) {
      alert('Error reading file: ' + error.message);
    }
  };

  const violations = getViolations();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">Course Planner</h1>
        <div className="flex items-center gap-3">
          {violations.length > 0 && (
            <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
              <AlertCircle size={20} />
              <span className="font-semibold">{violations.length} Violation{violations.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          <button
            onClick={handleExportData}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Export Data
          </button>
          <button
            onClick={handleImportData}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Import Data
          </button>
          <button
            onClick={() => {
              setEditingCourse(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Course
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm font-semibold text-gray-700">Degree Progress:</span>
        {degrees.map(degree => {
          const progress = getDegreeProgress(degree.id);
          const percentage = (progress / degree.requiredCredits) * 100;
          return (
            <div
              key={degree.id}
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700">{degree.name}:</span>
              <span className="text-sm font-bold text-blue-600">
                {progress}/{degree.requiredCredits} credits
              </span>
              <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
            </div>
          );
        })}
        <button
          onClick={() => {
            setEditingDegree(null);
            setShowDegreeForm(true);
          }}
          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
        >
          <Plus size={16} />
          Manage Degrees
        </button>
      </div>

      {violations.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Issues Found:</h3>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {violations.map((violation, idx) => (
              <li key={idx}>{violation}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="bg-white rounded-lg shadow-md p-4 mb-6"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'pool')}
      >
        <h2 className="text-xl font-semibold mb-3 text-gray-700">Course Pool</h2>
        <div className="flex flex-wrap gap-3 min-h-[80px]">
          {placements.pool?.map(courseId => {
            const course = courses.find(c => c.id === courseId);
            if (!course) return null;
            return (
              <CourseBlock
                key={course.id}
                course={course}
                onClick={() => setSelectedCourse(course)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                treeDepth={calculateTreeDepth(course.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {semesters.map(semester => {
          const credits = getSemesterCredits(semester);
          return (
            <div
              key={semester}
              className="bg-white rounded-lg shadow-md p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, semester)}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-700">{semester}</h2>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium text-gray-600 bg-blue-100 px-2 py-1 rounded">
                    UG: {credits.undergrad}
                  </span>
                  <span className="text-xs font-medium text-gray-600 bg-purple-100 px-2 py-1 rounded">
                    G: {credits.grad}
                  </span>
                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    Total: {credits.total}
                  </span>
                </div>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {placements[semester]?.map(courseId => {
                  const course = courses.find(c => c.id === courseId);
                  if (!course) return null;
                  return (
                    <CourseBlock
                      key={course.id}
                      course={course}
                      onClick={() => setSelectedCourse(course)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      treeDepth={calculateTreeDepth(course.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourse && (
        <SidePanel
          course={selectedCourse}
          courses={courses}
          degrees={degrees}
          treeDepth={calculateTreeDepth(selectedCourse.id)}
          onClose={() => setSelectedCourse(null)}
          onEdit={() => {
            setEditingCourse(selectedCourse);
            setShowForm(true);
            setSelectedCourse(null);
          }}
          onDelete={() => handleDeleteCourse(selectedCourse.id)}
        />
      )}

      {showForm && (
        <CourseForm
          course={editingCourse}
          courses={courses}
          degrees={degrees}
          onSave={handleAddCourse}
          onClose={() => {
            setShowForm(false);
            setEditingCourse(null);
          }}
        />
      )}

      {showDegreeForm && (
        <DegreeManager
          degrees={degrees}
          onClose={() => {
            setShowDegreeForm(false);
            setEditingDegree(null);
          }}
          onSave={handleAddDegree}
          onDelete={handleDeleteDegree}
        />
      )}

      <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setNotesExpanded(!notesExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="font-semibold text-gray-800">Planning Notes</span>
          <span className="text-gray-600">
            {notesExpanded ? '▼' : '▶'}
          </span>
        </button>
        {notesExpanded && (
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add your planning notes here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Notes are automatically saved and included in data exports
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const CourseBlock = ({ course, onClick, onDragStart, onDragEnd, treeDepth }) => (
  <div
    draggable="true"
    onDragStart={(e) => onDragStart(e, course.id)}
    onDragEnd={onDragEnd}
    onClick={onClick}
    className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-lg cursor-move hover:shadow-lg transition-shadow"
    style={{ WebkitUserDrag: 'element' }}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{course.code}</div>
        <div className="text-xs opacity-90 mt-1 truncate">{course.title}</div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-medium bg-white bg-opacity-20 px-2 py-0.5 rounded">
          {course.credits} cr
        </span>
        {treeDepth > 1 && (
          <span className="text-xs font-medium bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded">
            D:{treeDepth}
          </span>
        )}
      </div>
    </div>
  </div>
);

const SidePanel = ({ course, courses, degrees, treeDepth, onClose, onEdit, onDelete }) => {
  const renderPrerequisites = () => {
    if (!course.prerequisites || !course.prerequisites.groups || course.prerequisites.groups.length === 0) {
      return <p className="text-gray-500 text-sm italic">No prerequisites</p>;
    }

    return (
      <div className="space-y-2">
        {course.prerequisites.groups.map((group, idx) => (
          <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
            {group.type === 'course' && (
              <div>
                <span className="text-xs font-semibold text-gray-600">One of:</span>
                <ul className="list-disc list-inside text-sm text-gray-800 mt-1">
                  {group.courses.map(courseId => {
                    const prereqCourse = courses.find(c => c.id === courseId);
                    return prereqCourse ? (
                      <li key={courseId}>{prereqCourse.code} - {prereqCourse.title}</li>
                    ) : (
                      <li key={courseId} className="text-red-500">Unknown course (ID: {courseId})</li>
                    );
                  })}
                </ul>
              </div>
            )}
            {group.type === 'pattern' && (
              <div>
                <span className="text-xs font-semibold text-gray-600">Pattern:</span>
                <p className="text-sm text-gray-800 mt-1">
                  At least {group.count} {group.level ? `${group.level}xx` : ''} level{' '}
                  {group.department ? `${group.department}` : 'courses'}
                </p>
              </div>
            )}
          </div>
        ))}
        {course.prerequisites.groups.length > 1 && (
          <p className="text-xs text-gray-600 italic">All requirements above must be met (AND logic)</p>
        )}
      </div>
    );
  };

  const assignedDegreeNames = course.assignedDegrees?.map(degId => {
    const deg = degrees.find(d => d.id === degId);
    return deg ? deg.name : 'Unknown';
  }) || [];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{course.code}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <h3 className="text-lg text-gray-600 mb-4">{course.title}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Credits</label>
            <p className="text-gray-800">{course.credits}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
            <p className="text-gray-800">{course.level || 'Not specified'}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tree Depth</label>
            <p className="text-gray-800">{treeDepth}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Prerequisites</label>
            {renderPrerequisites()}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Mode</label>
            <p className="text-gray-800">{course.deliveryMode || 'In-Person'}</p>
          </div>

          {assignedDegreeNames.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Degrees</label>
              <div className="flex flex-wrap gap-2">
                {assignedDegreeNames.map((name, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {((course.semesterRestrictionsInPerson && course.semesterRestrictionsInPerson.length > 0) ||
            (course.semesterRestrictionsOnline && course.semesterRestrictionsOnline.length > 0)) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Semester Restrictions</label>
              <div className="space-y-1">
                {course.semesterRestrictionsInPerson && course.semesterRestrictionsInPerson.length > 0 && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">In-Person:</span> {course.semesterRestrictionsInPerson.join(', ')}
                  </p>
                )}
                {course.semesterRestrictionsOnline && course.semesterRestrictionsOnline.length > 0 && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Online:</span> {course.semesterRestrictionsOnline.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <p className="text-gray-800 text-sm">{course.description}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit2 size={16} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const CourseForm = ({ course, courses, degrees, onSave, onClose }) => {
  const [formData, setFormData] = useState(course || {
    code: '',
    title: '',
    credits: 3,
    level: 'Undergraduate',
    prerequisites: { type: 'and', groups: [] },
    deliveryMode: 'In-Person',
    semesterRestrictionsInPerson: [],
    semesterRestrictionsOnline: [],
    description: '',
    assignedDegrees: []
  });

  const [prereqGroups, setPrereqGroups] = useState(
    course?.prerequisites?.groups || []
  );

  const handleSubmit = () => {
    if (!formData.code || !formData.title) {
      alert('Please fill in course code and title');
      return;
    }
    onSave({
      ...formData,
      prerequisites: { type: 'and', groups: prereqGroups }
    });
  };

  const handleRestrictionToggle = (semester, mode) => {
    const field = mode === 'inPerson' ? 'semesterRestrictionsInPerson' : 'semesterRestrictionsOnline';
    const restrictions = formData[field] || [];
    if (restrictions.includes(semester)) {
      setFormData({ ...formData, [field]: restrictions.filter(s => s !== semester) });
    } else {
      setFormData({ ...formData, [field]: [...restrictions, semester] });
    }
  };

  const handleDegreeToggle = (degreeId) => {
    const assigned = formData.assignedDegrees || [];
    if (assigned.includes(degreeId)) {
      setFormData({ ...formData, assignedDegrees: assigned.filter(id => id !== degreeId) });
    } else {
      setFormData({ ...formData, assignedDegrees: [...assigned, degreeId] });
    }
  };

  const addPrereqGroup = (type) => {
    if (type === 'course') {
      setPrereqGroups([...prereqGroups, { type: 'course', courses: [] }]);
    } else {
      setPrereqGroups([...prereqGroups, { type: 'pattern', count: 1, level: '', department: '' }]);
    }
  };

  const removePrereqGroup = (index) => {
    setPrereqGroups(prereqGroups.filter((_, idx) => idx !== index));
  };

  const updateCourseGroup = (groupIndex, courseId) => {
    const newGroups = [...prereqGroups];
    const group = newGroups[groupIndex];
    if (group.courses.includes(courseId)) {
      group.courses = group.courses.filter(id => id !== courseId);
    } else {
      group.courses.push(courseId);
    }
    setPrereqGroups(newGroups);
  };

  const updatePatternGroup = (groupIndex, field, value) => {
    const newGroups = [...prereqGroups];
    newGroups[groupIndex][field] = value;
    setPrereqGroups(newGroups);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{course ? 'Edit Course' : 'Add New Course'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Course Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g., STAT 415"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Credits</label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="1"
                max="6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Course Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Introduction to Statistics"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="Undergraduate">Undergraduate</option>
              <option value="Graduate">Graduate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Prerequisites (AND Logic)</label>
            <div className="space-y-3 border border-gray-300 rounded-lg p-3 bg-gray-50">
              {prereqGroups.map((group, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Group {idx + 1}: {group.type === 'course' ? 'Course Options (OR)' : 'Pattern Match'}
                    </span>
                    <button
                      onClick={() => removePrereqGroup(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {group.type === 'course' && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {courses.filter(c => !course || c.id !== course.id).map(c => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={group.courses.includes(c.id)}
                            onChange={() => updateCourseGroup(idx, c.id)}
                            className="rounded"
                          />
                          <span>{c.code} - {c.title}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {group.type === 'pattern' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Count</label>
                        <input
                          type="number"
                          value={group.count}
                          onChange={(e) => updatePatternGroup(idx, 'count', parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Level (e.g., 4)</label>
                        <input
                          type="text"
                          value={group.level}
                          onChange={(e) => updatePatternGroup(idx, 'level', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="4"
                          maxLength="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Dept (e.g., STAT)</label>
                        <input
                          type="text"
                          value={group.department}
                          onChange={(e) => updatePatternGroup(idx, 'department', e.target.value.toUpperCase())}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="STAT"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  onClick={() => addPrereqGroup('course')}
                  className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  <Plus size={14} />
                  Add Course Group (OR)
                </button>
                <button
                  onClick={() => addPrereqGroup('pattern')}
                  className="flex items-center gap-1 bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                >
                  <Plus size={14} />
                  Add Pattern Group
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Mode</label>
            <select
              value={formData.deliveryMode}
              onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="In-Person">In-Person</option>
              <option value="Online">Online</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to Degrees</label>
            <div className="flex flex-wrap gap-3">
              {degrees.map(degree => (
                <label key={degree.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assignedDegrees?.includes(degree.id)}
                    onChange={() => handleDegreeToggle(degree.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{degree.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Semester Restrictions - In-Person</label>
            <div className="flex gap-4">
              {['Fall', 'Spring', 'Summer'].map(sem => (
                <label key={sem} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.semesterRestrictionsInPerson?.includes(sem)}
                    onChange={() => handleRestrictionToggle(sem, 'inPerson')}
                    className="rounded"
                  />
                  <span className="text-sm">{sem}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Semester Restrictions - Online</label>
            <div className="flex gap-4">
              {['Fall', 'Spring', 'Summer'].map(sem => (
                <label key={sem} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.semesterRestrictionsOnline?.includes(sem)}
                    onChange={() => handleRestrictionToggle(sem, 'online')}
                    className="rounded"
                  />
                  <span className="text-sm">{sem}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows="3"
              placeholder="Course description..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {course ? 'Save Changes' : 'Add Course'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DegreeManager = ({ degrees, onClose, onSave, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDegree, setEditingDegree] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Bachelor',
    requiredCredits: 120
  });

  const handleEdit = (degree) => {
    setEditingDegree(degree);
    setFormData({
      name: degree.name,
      type: degree.type,
      requiredCredits: degree.requiredCredits
    });
    setShowAddForm(true);
  };

  const handleSubmit = () => {
    if (!formData.name || formData.requiredCredits <= 0) {
      alert('Please fill in all degree information');
      return;
    }

    // Pass the full degree data including id to parent
    onSave(editingDegree ? { ...formData, id: editingDegree.id } : formData);

    setShowAddForm(false);
    setEditingDegree(null);
    setFormData({ name: '', type: 'Bachelor', requiredCredits: 120 });
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingDegree(null);
    setFormData({ name: '', type: 'Bachelor', requiredCredits: 120 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Manage Degrees</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {!showAddForm ? (
          <>
            <div className="space-y-3 mb-4">
              {degrees.map(degree => (
                <div key={degree.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">{degree.name}</h3>
                    <p className="text-sm text-gray-600">
                      {degree.type} - {degree.requiredCredits} credits required
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(degree)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(degree.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full justify-center"
            >
              <Plus size={20} />
              Add New Degree
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Degree Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g., Bachelor of Science - Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Degree Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Bachelor">Bachelor</option>
                <option value="Master">Master</option>
                <option value="Doctorate">Doctorate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Required Credits</label>
              <input
                type="number"
                value={formData.requiredCredits}
                onChange={(e) => setFormData({ ...formData, requiredCredits: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingDegree ? 'Save Changes' : 'Add Degree'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePlanner;