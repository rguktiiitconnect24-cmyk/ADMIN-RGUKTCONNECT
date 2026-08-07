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

    // Finally, check if the specific department is in their allowed list
    return user.targetDepartments.includes(department);
};
