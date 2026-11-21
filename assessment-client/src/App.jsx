import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AssessmentRegister from './pages/AssessmentRegister';
import AssessmentVerify from './pages/AssessmentVerify';
import AssessmentSignIn from './pages/AssessmentSignIn';
import AssessmentIntro from './pages/AssessmentIntro';
import AssessmentExam from './pages/AssessmentExam';
import AssessmentComplete from './pages/AssessmentComplete';
import AssessmentResult from './pages/AssessmentResult';

const App = () => {
  return (
    <Routes>
      {/* 1st: Registration */}
      <Route path="/" element={<AssessmentRegister />} />
      <Route path="/register" element={<AssessmentRegister />} />
      <Route path="/assessment" element={<AssessmentRegister />} />
      <Route path="/assessment/register" element={<AssessmentRegister />} />

      {/* 2nd: Email Verification */}
      <Route path="/verify" element={<AssessmentVerify />} />
      <Route path="/assessment/verify" element={<AssessmentVerify />} />

      {/* 3rd: Assessment Desk Sign In */}
      <Route path="/signin" element={<AssessmentSignIn />} />
      <Route path="/assessment/signin" element={<AssessmentSignIn />} />

      {/* 4th: Rules & Declaration */}
      <Route path="/:candidateCode/intro" element={<AssessmentIntro />} />
      <Route path="/assessment/:candidateCode/intro" element={<AssessmentIntro />} />

      {/* 5th: Live Examination Desk */}
      <Route path="/:candidateCode/exam" element={<AssessmentExam />} />
      <Route path="/assessment/:candidateCode/exam" element={<AssessmentExam />} />

      {/* 6th: Completed Registration */}
      <Route path="/:candidateCode/complete" element={<AssessmentComplete />} />
      <Route path="/assessment/:candidateCode/complete" element={<AssessmentComplete />} />

      {/* Result review */}
      <Route path="/:candidateCode/result" element={<AssessmentResult />} />
      <Route path="/assessment/:candidateCode/result" element={<AssessmentResult />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
