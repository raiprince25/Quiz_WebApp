const { Class, Teacher, Student, Quiz, StudentResponse, StudentResult} = require("../models/models");
const calculateAndStoreResults = require("../utils/calculateResult")
const json2csv = require('json2csv').parse;
const express = require("express");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class-related endpoints
 */

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get classes for the authenticated user (teacher or student)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successful retrieval of user classes
 *         content:
 *           application/json:
 *             example:
 *               classes: [{ class_name: "Math", teacher_id: "teacherId", students: ["studentId1", "studentId2"], quizzes: ["quizId1", "quizId2"] }]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal Server Error
 */

router.get("/", async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let classes;
    if (user.role === "teacher") {
      classes = await Class.find({ teacher_id: user.id });
    } else if (user.role === "student") {
      //   classes = await Class.find({ _id: { $in: user.classes } });
      classes = await Class.find({ students: { $in: user.id } });
    }
    classes = await Promise.all(
      classes.map(async (cls) => {
        const classObject = cls.toObject();
        const teacher = await Teacher.findById(cls.teacher_id);
        const teacherobj = teacher.toObject();
        delete teacherobj["password"];
        return {
          classObject,
          teacher: teacherobj,
        };
      })
    );
    res.json({ classes });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/create:
 *   post:
 *     summary: Create a new class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful creation of a new class
 *         content:
 *           application/json:
 *             example:
 *               message: Class created successfully
 *               class: { class_name: "Math", teacher_id: "teacherId" }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       500:
 *         description: Internal Server Error
 */

router.post("/create", async (req, res) => {
  try {
    const decoded = req.user;
    // console.log(decoded);

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { class_name } = req.body;

    const newClass = new Class({
      class_name,
      teacher_id: decoded.id,
    });

    await newClass.save();

    res.json({ message: "Class created successfully", class: newClass });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/:classId/add-student:
 *   post:
 *     summary: Add a student to a class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *     parameters:
 *       - name: classId
 *         in: path
 *         required: true
 *         description: ID of the class
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful addition of a student to the class
 *         content:
 *           application/json:
 *             example:
 *               message: Student added to the class successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/:classId/add-student", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { studentId } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    existingClass.students.push(student._id);
    await existingClass.save();

    res.json({ message: "Student added to the class successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/join:
 *   post:
 *     summary: Join a class (for students)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful joining of a class
 *         content:
 *           application/json:
 *             example:
 *               message: Student joined the class successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a student
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/join", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "student") {
      return res.status(403).json({ error: "User is not a student" });
    }

    const { classId } = req.body;

    const existingClass = await Class.findById(classId);

    const student = await Student.findById(decoded.id);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (!existingClass.students.includes(student._id)) {
      existingClass.students.push(student._id);
      await existingClass.save();
      await Student.findByIdAndUpdate(
        decoded.id,
        { $addToSet: { classes: classId } },
        { new: true }
      );
      res.json({ message: "Student joined the class successfully" });
    } else {
      res.json({ message: "Student already in the class" });
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/students:
 *   get:
 *     summary: Get the list of students in a class
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     responses:
 *       200:
 *         description: Successful retrieval of students
 *         content:
 *           application/json:
 *             example:
 *               students:
 *                 - id: 60b8f2e2e9e7d0b3a4a3d9c8
 *                   name: John Doe
 *                   email: john.doe@example.com
 *                   username: john.doe
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */
router.get("/:classId/students", async (req, res) => {
  try {
    const decoded = req.user;

    // Ensure the user is authenticated and has the necessary role
    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const classId = req.params.classId;

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const students = await Promise.all(
      myClass.students.map(async (studentId) => {
        const student = await Student.findById(studentId);
        return {
          id: student._id,
          name: student.full_name,
          email: student.email,
          username: student.username,
        };
      })
    );
    res.json({ students });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz-related endpoints
 */

/**
 * @swagger
 * /api/classes/{classId}/quizzes:
 *   post:
 *     summary: Create a new quiz in a class (for teachers)
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quiz_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *     responses:
 *       200:
 *         description: Successful creation of a new quiz
 *         content:
 *           application/json:
 *             example:
 *               message: Quiz created successfully
 *               quiz: { quiz_name: "Math Quiz", class_id: "classId", start_date: "2024-01-20T12:00:00Z", duration: 60, questions: [...] }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/:classId/quizzes", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { quiz_name, start_date, duration, questions } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    // Validate start_date is in the future
    const now = new Date();
    const quizStartDate = new Date(start_date);

    if (quizStartDate <= now) {
      return res
        .status(400)
        .json({ error: "Quiz start date must be in the future" });
    }
    // console.log(req.body)
    const newQuiz = await new Quiz({
      quiz_name,
      class_id: classId,
      start_date,
      duration,
      questions,
    });

    // console.log(newQuiz)
    try {
      await newQuiz.validate(); // Validate the document
      await newQuiz.save();
      existingClass.quizzes.push(newQuiz._id);
      await existingClass.save();
      // console.log('Quiz saved successfully:', newQuiz);
    } catch (error) {
      console.error('Error saving quiz:', error);
    }

    res.json({ message: "Quiz created successfully", quiz: newQuiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}:
 *   patch:
 *     summary: Update a quiz in a class (for teachers)
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quiz_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *     responses:
 *       200:
 *         description: Successful update of a quiz
 *         content:
 *           application/json:
 *             example:
 *               message: Quiz updated successfully
 *               quiz: { quiz_name: "Updated Math Quiz", class_id: "classId", start_date: "2024-01-20T12:00:00Z", duration: 60, questions: [...] }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */

router.patch("/:classId/quizzes/:quizId", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId, quizId } = req.params;
    const { quiz_name, start_date, duration, questions } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    const existingQuiz = await Quiz.findById(quizId);

    if (!existingQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Validate start_date is in the future
    const now = new Date();
    const quizStartDate = new Date(start_date);

    if (quizStartDate <= now) {
      return res
        .status(400)
        .json({ error: "Quiz start date must be in the future" });
    }

    // Update quiz details
    existingQuiz.quiz_name = quiz_name;
    existingQuiz.start_date = start_date;
    existingQuiz.duration = duration;
    existingQuiz.questions = questions;

    await existingQuiz.save();

    res.json({ message: "Quiz updated successfully", quiz: existingQuiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}:
 *   get:
 *     summary: Get details of a quiz in a class
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     responses:
 *       '200':
 *         description: Successful retrieval of quiz details
 *         content:
 *           application/json:
 *             example:
 *               quiz: 
 *                 quiz_name: "Math Quiz"
 *                 class_id: "classId"
 *                 start_date: "2024-01-20T12:00:00Z"
 *                 duration: 60
 *                 questions: [...]
 *       '401':
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid token"
 *       '403':
 *         description: Forbidden - Only authenticated users can access this endpoint or user is not authorized to access this quiz
 *         content:
 *           application/json:
 *             example:
 *               error: "Forbidden - Only authenticated users can access this endpoint" 
 *       '404':
 *         description: Class or quiz not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Class not found" 
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal Server Error"
 */
router.get("/:classId/quizzes/:quizId", async (req, res) => {
  try {
    const decoded = req.user;

    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const { classId, quizId } = req.params;

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOrStudentInClass =
      myClass.teacher_id.equals(decoded.id) ||
      myClass.students.includes(decoded.id);

    if (!isTeacherOrStudentInClass) {
      return res
        .status(403)
        .json({ error: "User is not authorized to access this quiz" });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    if (decoded.role === "student") {
      const endDate = new Date();
      endDate.setMinutes(quiz.start_date.getMinutes() + quiz.duration);
      const currentDate = new Date();// Convert duration to milliseconds
      //fixed
      if(!quiz){
        return res.status(404).json({ error: "Quiz not found" });
      }
      if(!quiz || currentDate > quiz.start_date && currentDate > endDate){
        return res.status(403).json({ error: "Forbidden - Quiz has already passed" });
      }
      if(!quiz || currentDate < quiz.start_date){
        return res.status(403).json({ error: "Forbidden - Quiz has not started" });
      }
      const isStudentTakeExam = await StudentResponse.findOne({student_id:decoded.id, quiz_id:quizId});
      if(isStudentTakeExam){
        return res.status(403).json({ error: "Forbidden - Student has already taken the Quiz !" });
      }
    }

    res.json({ quiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * @swagger
 * /api/classes/{classId}/quizzes:
 *   get:
 *     summary: Get a list of quizzes in a class
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     responses:
 *       200:
 *         description: Successful retrieval of quizzes
 *         content:
 *           application/json:
 *             example:
 *               quizzes:
 *                 - quiz_name: "Math Quiz"
 *                   quiz_id: "quizId1"
 *                   start_date: "2024-01-20T12:00:00Z"
 *                   duration: 60
 *                 - quiz_name: "Science Quiz"
 *                   quiz_id: "quizId2"
 *                   start_date: "2024-01-21T14:00:00Z"
 *                   duration: 45
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.get("/:classId/quizzes", async (req, res) => {
  try {
    const decoded = req.user;

    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const { classId } = req.params;
    // console.log(req.params)

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOrStudentInClass =
      myClass.teacher_id.equals(decoded.id) ||
      myClass.students.includes(decoded.id);

    if (!isTeacherOrStudentInClass) {
      return res
        .status(403)
        .json({ error: "User is not authorized to access quizzes in this class" });
    }

    const quizzes = await Quiz.find({ class_id: classId });
    // console.log(quizzes);

    const formattedQuizzes = quizzes.map((quiz) => ({
      quiz_name: quiz.quiz_name,
      quiz_id: quiz._id,
      start_date: quiz.start_date,
      duration: quiz.duration,
    }));

    res.json({ quizzes: formattedQuizzes });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * tags:
 *   name: Responses
 *   description: Responses-related endpoints
 */

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}/responses:
 *   post:
 *     summary: Submit responses for a quiz
 *     tags: [Responses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             student_id: "studentId"
 *             responses:
 *               - question_id: "questionId1"
 *                 selected_options: ["optionId1"]
 *               - question_id: "questionId2"
 *                 selected_options: ["optionId2"]
 *     responses:
 *       '200':
 *         description: Successful submission of responses
 *         content:
 *           application/json:
 *             example:
 *               message: "Student responses stored successfully"
 *               score: 5
 *               out_of: 10
 *       '400':
 *         description: Invalid format for response
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid format for response"
 *       '403':
 *         description: Forbidden - Quiz has not started or has already passed
 *         content:
 *           application/json:
 *             example:
 *               error: "Forbidden - Quiz has not started or has already passed"
 *       '404':
 *         description: Quiz not found
 *         content:
 *           application/json:
 *             example:
 *               error: "Quiz not found"
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal Server Error"
 */
router.post("/:classId/quizzes/:quizId/responses", async (req, res) => {
  try {
    const decoded = req.user;

    if (!decoded || decoded.role !== "student") {
      return res.status(403).json({ error: "Forbidden - Only authenticated students can access this endpoint" });
    }

    const { classId, quizId } = req.params;
    const { student_id, responses } = req.body;

    const quiz = await Quiz.findById(quizId);
    //fixed
    const endDate = new Date();
    endDate.setMinutes(quiz.start_date.getMinutes() + quiz.duration);
    const currentDate = new Date();
    if(!quiz){
      return res.status(404).json({ error: "Quiz not found" });
    }
    if(!quiz || currentDate > quiz.start_date && currentDate > endDate){
      return res.status(403).json({ error: "Forbidden - Quiz has already passed" });
    }
    if(!quiz || currentDate < quiz.start_date){
      return res.status(403).json({ error: "Forbidden - Quiz has not started" });
    }
    const isStudentTakeExam = await StudentResponse.findOne({student_id:student_id, quiz_id:quizId});
    if(isStudentTakeExam){
      return res.status(403).json({ error: "Forbidden - Student has already taken the Quiz !" });
    }
    const allResponses = [];

    for (const response of responses) {
      const { question_id, selected_options } = response;

      if (!question_id || !selected_options || !Array.isArray(selected_options)) {
        return res.status(400).json({ error: "Invalid format for response" });
      }

      allResponses.push({
        question_id,
        selected_options,
      });
    }
    const correctResponses = quiz.questions.map(question => ({
      question_id: question._id.toString(),
      selected_options: question.options.filter(option => option.is_correct).map(option => option._id.toString()),
    }));

    const studentResponseinfo = new StudentResponse({
      student_id,
      quiz_id: quizId,
      responses: allResponses,
    });

    await studentResponseinfo.save();
    const numberOfQuestions = quiz.questions.length;
    const score = await calculateAndStoreResults(student_id, quizId, correctResponses, responses, numberOfQuestions);
    
    res.json({ message: "Student responses stored successfully", score:score, out_of:numberOfQuestions});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
/**
 * @swagger
 * tags:
 *   name: Results
 *   description: Results-related endpoints
 */
/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}/results/{studentId}:
 *   get:
 *     summary: Get the result of a student in a quiz
 *     tags: [Results]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *       - in: path
 *         name: studentId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student
 *     responses:
 *       200:
 *         description: Successful retrieval of student's result
 *         content:
 *           application/json:
 *             example:
 *               score: 5
 *               out_of: 10
 *       404:
 *         description: Student result not found
 *       500:
 *         description: Internal Server Error
 */

router.get("/:classId/quizzes/:quizId/results/:studentId", async (req, res) => {
  try {
    const { quizId, studentId } = req.params;
    const studentResult = await StudentResult.findOne({ student_id: studentId, quiz_id: quizId });

    if (!studentResult) {
      return res.status(404).json({ error: "Student result not found" });
    }
    res.json({ score: studentResult.score, out_of: studentResult.out_of });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}/results:
 *   get:
 *     summary: Get results of all students for a quiz in a class
 *     tags: [Results]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     responses:
 *       200:
 *         description: Successful retrieval of student results
 *         content:
 *           application/json:
 *             example:
 *               results:
 *                 - _id: "65a846f86d21746c7aef7ff6"
 *                   student_id:
 *                     _id: "65a31695c007a2f91fc20d4e"
 *                     full_name: "mohsine"
 *                   quiz_id:
 *                     _id: "65a7fb166eb1863cbe4c1877"
 *                     quiz_name: "uml"
 *                   score: 0
 *                   out_of: 2
 *                   submitted_at: "2024-01-17T21:30:32.705Z"
 *                   __v: 0
 *               average_score: 4.5
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access results
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */
router.get("/:classId/quizzes/:quizId/results", async (req, res) => {
  try {
    const decoded = req.user;

    if (!decoded || decoded.role !== "teacher") {
      return res.status(403).json({ error: "Forbidden - Only authenticated teachers can access this endpoint" });
    }

    const { classId, quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Ensure the teacher is the owner of the class
    if (!quiz.class_id.equals(classId)) {
      return res.status(403).json({ error: "Forbidden - You are not the teacher of this class" });
    }

    // Retrieve all student results for the given quiz
    const results = await StudentResult.find({ quiz_id: quizId }).populate('student_id', 'full_name').populate('quiz_id', 'quiz_name');

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}/csvresults:
 *   get:
 *     summary: Download quiz results in CSV format
 *     tags: [Results]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     responses:
 *       200:
 *         description: Successful download of quiz results in CSV format
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden - Only authenticated teachers can access this endpoint
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */
router.get("/:classId/quizzes/:quizId/csvresults", async (req, res) => {
  try {
    const decoded = req.user;

    if (!decoded || decoded.role !== "teacher") {
      return res.status(403).json({ error: "Forbidden - Only authenticated teachers can access this endpoint" });
    }
    const { classId, quizId } = req.params;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (!quiz.class_id.equals(classId)) {
      return res.status(403).json({ error: "Forbidden - You are not the teacher of this class" });
    }

    const currentclass = await Class.findById(classId);

    if (!currentclass) {
      return res.status(404).json({ error: "Class not found" });
    }
    const results = await StudentResult.find({ quiz_id: quizId }).populate('quiz_id', 'quiz_name').populate('student_id', 'full_name');
    const resultsWithAdditionalInfo = results.map(result => {
      return {
        ...result.toObject(),
        quiz_name: quiz.quiz_name,
        class_name: currentclass.class_name,
      };
    });
    // console.log(resultsWithAdditionalInfo);
    const csvData = json2csv(resultsWithAdditionalInfo, { fields: [{ label: 'full_name', value: 'student_id.full_name'}, 'submitted_at','score','out_of', 'quiz_name', 'class_name'] });
    res.setHeader('Content-Type', 'text/csv');
    res.attachment(`quiz_results_${quizId}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/remove-student:
 *   delete:
 *     summary: Remove a student from a class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *     parameters:
 *       - name: classId
 *         in: path
 *         required: true
 *         description: ID of the class
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful removal of a student from the class
 *         content:
 *           application/json:
 *             example:
 *               message: Student removed from the class successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class or student not found
 *       500:
 *         description: Internal Server Error
 */
router.delete("/:classId/remove-student", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { studentId } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    const studentIndex = existingClass.students.indexOf(studentId);

    if (studentIndex === -1) {
      return res.status(404).json({ error: "Student not found in the class" });
    }

    existingClass.students.splice(studentIndex, 1);
    await existingClass.save();

    res.json({ message: "Student removed from the class successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}:
 *   delete:
 *     summary: Delete a quiz in a class (for teachers)
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     responses:
 *       200:
 *         description: Successful deletion of a quiz
 *         content:
 *           application/json:
 *             example:
 *               message: Quiz deleted successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */
router.delete("/:classId/quizzes/:quizId", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId, quizId } = req.params;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    //  = existingClass.quizzes.findIndex(
    //   (quiz) => {quiz._id.toString() === quizId}
    // );

    let quizIndex = -1; 
    existingClass.quizzes.forEach(
      (quiz, index) => {if(quiz._id.toString() === quizId){ quizIndex = index; return;}}
    );

    // console.log(existingClass)
    // console.log(quizIndex)
    const quiz = await Quiz.findById(quizId);
    if (quizIndex === -1 && !quiz || !quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    await quiz.deleteOne();

    if(quizIndex!=-1)
    {existingClass.quizzes.splice(quizIndex, 1);
    await existingClass.save();
    }

    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}:
 *   delete:
 *     summary: Delete a class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     responses:
 *       200:
 *         description: Successful deletion of a class
 *         content:
 *           application/json:
 *             example:
 *               message: Class deleted successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */
router.delete("/:classId", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    await existingClass.deleteOne();

    res.json({ message: "Class deleted successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}:
 *   patch:
 *     summary: Update class details (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful update of class details
 *         content:
 *           application/json:
 *             example:
 *               message: Class details updated successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */
router.patch("/:classId", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { name, description } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    if (name) existingClass.name = name;
    if (description) existingClass.description = description;

    await existingClass.save();

    res.json({ message: "Class details updated successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;