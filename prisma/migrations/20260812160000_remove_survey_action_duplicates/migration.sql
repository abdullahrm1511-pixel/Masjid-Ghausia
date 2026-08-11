-- Verhogingen en opzeggingen horen bij SurveyMemberRequest en niet ook bij gewone antwoorden.
DELETE FROM "SurveyResponse"
WHERE "answers" ? 'memberAction';
