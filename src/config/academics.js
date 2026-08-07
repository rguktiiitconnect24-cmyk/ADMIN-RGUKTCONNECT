import { GraduationCap, BookOpen } from 'lucide-react';

export const PROGRAMS = [
    {
        id: 'puc',
        label: 'Pre-University Course (PUC)',
        description: 'Foundational courses for years 1 and 2',
        icon: BookOpen,
        color: 'blue',
        years: [
            {
                id: 'puc1',
                label: 'PUC-1',
                subLabel: 'First Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ]
            },
            {
                id: 'puc2',
                label: 'PUC-2',
                subLabel: 'Second Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ]
            }
        ]
    },
    {
        id: 'btech',
        label: 'Bachelor of Technology (B.Tech)',
        description: 'Engineering program ranging from Year 1 to Year 4',
        icon: GraduationCap,
        color: 'indigo',
        years: [
            {
                id: 'btech1',
                label: 'Engineering 1',
                subLabel: 'First Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ],
                branches: [
                    { id: 'aiml', label: 'AI & ML', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'cse', label: 'Computer Science & Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ece', label: 'Electronics & Communication Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'eee', label: 'Electrical & Electronics Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ce', label: 'Civil Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'mme', label: 'Metallurgical & Materials Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'me', label: 'Mechanical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'che', label: 'Chemical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] }
                ]
            },
            {
                id: 'btech2',
                label: 'Engineering 2',
                subLabel: 'Second Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ],
                branches: [
                    { id: 'aiml', label: 'AI & ML', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'cse', label: 'Computer Science & Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ece', label: 'Electronics & Communication Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'eee', label: 'Electrical & Electronics Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ce', label: 'Civil Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'mme', label: 'Metallurgical & Materials Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'me', label: 'Mechanical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'che', label: 'Chemical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] }
                ]
            },
            {
                id: 'btech3',
                label: 'Engineering 3',
                subLabel: 'Third Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ],
                branches: [
                    { id: 'aiml', label: 'AI & ML', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'cse', label: 'Computer Science & Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ece', label: 'Electronics & Communication Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'eee', label: 'Electrical & Electronics Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ce', label: 'Civil Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'mme', label: 'Metallurgical & Materials Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'me', label: 'Mechanical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'che', label: 'Chemical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] }
                ]
            },
            {
                id: 'btech4',
                label: 'Engineering 4',
                subLabel: 'Fourth Year',
                semesters: [
                    { id: 'sem1', label: 'Semester 1', subjects: [] },
                    { id: 'sem2', label: 'Semester 2', subjects: [] }
                ],
                branches: [
                    { id: 'aiml', label: 'AI & ML', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'cse', label: 'Computer Science & Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ece', label: 'Electronics & Communication Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'eee', label: 'Electrical & Electronics Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'ce', label: 'Civil Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'mme', label: 'Metallurgical & Materials Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'me', label: 'Mechanical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] },
                    { id: 'che', label: 'Chemical Engineering', semesters: [{ id: 'sem1', label: 'Semester 1', subjects: [] }, { id: 'sem2', label: 'Semester 2', subjects: [] }] }
                ]
            }
        ]
    }
];
