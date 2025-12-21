-- AlterTable
ALTER TABLE `criteria` ADD COLUMN `answer1Percentage` DOUBLE NULL DEFAULT 20,
    ADD COLUMN `answer2Percentage` DOUBLE NULL DEFAULT 20,
    ADD COLUMN `answer3Percentage` DOUBLE NULL DEFAULT 20,
    ADD COLUMN `answer4Percentage` DOUBLE NULL DEFAULT 20,
    ADD COLUMN `answer5Percentage` DOUBLE NULL DEFAULT 20;
