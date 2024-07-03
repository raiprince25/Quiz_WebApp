const {StudentResult} = require('../models/models');
const calculateResults = async (
  studentId,
  quizId,
  correctResponses,
  submittedResponses,
  numberOfQuestions
) => {
  let score = 0;

  submittedResponses.forEach((submittedResponse) => {
    const correctResponse = correctResponses.find(
      (response) => response.question_id === submittedResponse.question_id
    );

    if (correctResponse) {
      const isCorrect = arraysEqual(
        correctResponse.selected_options,
        submittedResponse.selected_options
      );

      if (isCorrect) {
        score++;
      }
    }
  });

  const studentResult = new StudentResult({
    student_id: studentId,
    quiz_id: quizId,
    score,
    out_of:numberOfQuestions
  });

  await studentResult.save();

  return score;
};

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }

  return true;
}

module.exports = calculateResults;
