/**
 * User Management Service
 *
 * Manages database-stored users (non-admin users).
 * Admin user remains in config vars for security.
 *
 * Features:
 * - Create/update/delete users (admin only)
 * - Password hashing with bcrypt
 * - Role-based access (viewer/editor)
 * - User activation/deactivation
 * - Login tracking
 */

const bcrypt = require('bcrypt');
const db = require('./databaseService');

const LOG_PREFIX = '[User Service]';
const SALT_ROUNDS = 10;

/**
 * Get all users (excluding admin)
 */
async function getAllUsers() {
  try {
    const result = await db.query(`
      SELECT
        id, username, full_name, email, role, is_active,
        created_by, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
    `);

    return result.rows;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching users:`, error);
    throw error;
  }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching user ${username}:`, error);
    throw error;
  }
}

/**
 * Create new user
 */
async function createUser(userData, createdBy) {
  try {
    const { username, password, fullName, email, role } = userData;

    // Validate username doesn't exist
    const existing = await getUserByUsername(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    // Validate role
    if (!['viewer', 'editor'].includes(role)) {
      throw new Error('Invalid role. Must be viewer or editor.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await db.query(`
      INSERT INTO users (username, password_hash, full_name, email, role, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, full_name, email, role, is_active, created_at
    `, [username, passwordHash, fullName, email, role, createdBy]);

    console.log(`${LOG_PREFIX} User created: ${username} (${role}) by ${createdBy}`);
    return result.rows[0];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error creating user:`, error);
    throw error;
  }
}

/**
 * Update user
 */
async function updateUser(username, updates) {
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    const setParts = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (updates.fullName !== undefined) {
      setParts.push(`full_name = $${paramIndex++}`);
      values.push(updates.fullName);
    }
    if (updates.email !== undefined) {
      setParts.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      if (!['viewer', 'editor'].includes(updates.role)) {
        throw new Error('Invalid role. Must be viewer or editor.');
      }
      setParts.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.isActive !== undefined) {
      setParts.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
      setParts.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    // Always update updated_at
    setParts.push(`updated_at = NOW()`);

    // Add username to values (for WHERE clause)
    values.push(username);

    const query = `
      UPDATE users
      SET ${setParts.join(', ')}
      WHERE username = $${paramIndex}
      RETURNING id, username, full_name, email, role, is_active, updated_at
    `;

    const result = await db.query(query, values);
    console.log(`${LOG_PREFIX} User updated: ${username}`);
    return result.rows[0];
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating user ${username}:`, error);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(username) {
  try {
    const result = await db.query(
      'DELETE FROM users WHERE username = $1 RETURNING username',
      [username]
    );

    if (result.rowCount === 0) {
      throw new Error('User not found');
    }

    console.log(`${LOG_PREFIX} User deleted: ${username}`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting user ${username}:`, error);
    throw error;
  }
}

/**
 * Authenticate user (check username and password)
 * Returns user object if valid, null if invalid
 */
async function authenticateUser(username, password) {
  try {
    const user = await getUserByUsername(username);

    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      console.log(`${LOG_PREFIX} Login attempt for inactive user: ${username}`);
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

    // Update last login time
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE username = $1',
      [username]
    );

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error authenticating user ${username}:`, error);
    throw error;
  }
}

/**
 * Change user password
 */
async function changePassword(username, newPassword) {
  try {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2',
      [passwordHash, username]
    );

    console.log(`${LOG_PREFIX} Password changed for user: ${username}`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Error changing password for ${username}:`, error);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  authenticateUser,
  changePassword
};
