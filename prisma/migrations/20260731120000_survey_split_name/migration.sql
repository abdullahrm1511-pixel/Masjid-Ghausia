ALTER TABLE "SurveyResponse" ADD COLUMN "firstName" TEXT;
ALTER TABLE "SurveyResponse" ADD COLUMN "lastName" TEXT;

UPDATE "SurveyResponse"
SET
  "firstName" = CASE WHEN POSITION(' ' IN TRIM("name")) > 0 THEN SPLIT_PART(TRIM("name"), ' ', 1) ELSE TRIM("name") END,
  "lastName" = CASE WHEN POSITION(' ' IN TRIM("name")) > 0 THEN SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name")) + 1) ELSE '-' END;

ALTER TABLE "SurveyResponse" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "SurveyResponse" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "SurveyResponse" DROP COLUMN "name";
