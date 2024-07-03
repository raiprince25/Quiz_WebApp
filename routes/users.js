const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Teacher, Student } = require('../models/models'); // Adjust the path based on your project structure

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

const generateToken = (user) => {
    const payload = {
        id: user._id,
        username: user.username,
        role: user instanceof Teacher ? 'teacher' : 'student',
    };

    const options = {
        expiresIn: '24h', // Token expiration time
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * @swagger
 * /api/user/teacher/signup:
 *   post:
 *     summary: Signup for a teacher account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful signup, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       500:
 *         description: Internal Server Error
 */
router.post('/teacher/signup', async (req, res) => {
    try {
        const { username, password, full_name, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newTeacher = new Teacher({
            username,
            password: hashedPassword,
            full_name,
            email,
        });

        await newTeacher.save();

        const token = generateToken(newTeacher);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/student/signup:
 *   post:
 *     summary: Signup for a student account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful signup, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       500:
 *         description: Internal Server Error
 */

router.post('/student/signup', async (req, res) => {
    try {
        const { username, password, full_name, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({
            username,
            password: hashedPassword,
            full_name,
            email,
        });

        await newStudent.save();

        const token = generateToken(newStudent);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/teacher/login:
 *   post:
 *     summary: Login for a teacher account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal Server Error
 */
router.post('/teacher/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const teacher = await Teacher.findOne({ username });

        if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(teacher);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/student/login:
 *   post:
 *     summary: Login for a student account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal Server Error
 */
router.post('/student/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const student = await Student.findOne({ username });

        if (!student || !(await bcrypt.compare(password, student.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(student);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



/**
 * @swagger
 * tags:
 *   name: User
 *   description: User information endpoints
 */

/**
 * @swagger
 * /api/user/info:
 *   get:
 *     summary: Get user information
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successful retrieval of user information
 *         content:
 *           application/json:
 *             example:
 *               id: 60b8f2e2e9e7d0b3a4a3d9c8
 *               name: John Doe
 *               email: john.doe@example.com
 *               role: teacher
 *               username: john.doe
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal Server Error
 */

router.get('/info', async (req, res) => {
  try {
      const token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      if (decoded.role === 'teacher') {
          user = await Teacher.findById(decoded.id);
      } else if (decoded.role === 'student') {
          user = await Student.findById(decoded.id);
      }

      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      const userInfo = {
          id: user._id,
          name: user.full_name,
          email: user.email,
          role: decoded.role,
          username: user.username,
      };

      res.json(userInfo);
  } catch (error) {
      if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
      }
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/user/update:
 *   patch:
 *     summary: Update user information
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful update of user information
 *         content:
 *           application/json:
 *             example:
 *               message: User information updated successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */

router.patch('/update', async (req, res) => {
  try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user;
      if (decoded.role === 'teacher') {
          user = await Teacher.findByIdAndUpdate(decoded.id, req.body, { new: true });
      } else if (decoded.role === 'student') {
          user = await Student.findByIdAndUpdate(decoded.id, req.body, { new: true });
      }
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User information updated successfully' });
  } catch (error) {
      if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
      }
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;