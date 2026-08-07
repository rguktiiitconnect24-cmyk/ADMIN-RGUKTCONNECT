/**
 * Role-Based Access Control (RBAC) Utilities
 */

/**
 * Checks if an admin is allowed to access or manage a specific department.
 * 
 * @param {string} department - The department ID/label (e.g., 'CSE', 'ECE').
 * @param {object} user - The current logged-in admin user object.
 * @returns {boolean} - True if allowed, false otherwise.
 */
export const isDepartmentAllowed = (department, user) => {
    if (!user || user.role !== 'admin') return false;
    
    // Super admins have full access
    if (user.permissions && user.permissions.includes('all')) return true;

    // If targetDepartments is missing or empty, they have unrestricted access
    // (As per CreateAdminAccount logic: "Leave empty for all departments")
    if (!user.targetDepartments || user.targetDepartments.length === 0) return true;

    // Normalize the input department string to handle synonyms across modules
    const normalize = (dept) => {
        if (!dept) return '';
        const d = dept.toString().toLowerCase().trim();
        if (d === 'aiml' || d === 'cse(ai&ml)') return 'aiml';
        if (d === 'cse') return 'cse';
        if (d === 'ece') return 'ece';
        if (d === 'eee') return 'eee';
        if (d === 'ce' || d === 'civil') return 'ce';
        if (d === 'me' || d === 'mech') return 'me';
        if (d === 'mme') return 'mme';
        if (d === 'che' || d === 'chem') return 'che';
        return d;
    };

    const targetNormalized = user.targetDepartments.map(normalize);
    const deptNormalized = normalize(department);

    return targetNormalized.includes(deptNormalized);
};
