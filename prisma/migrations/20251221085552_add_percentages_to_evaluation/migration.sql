-- AlterTable
ALTER TABLE `evaluations` ADD COLUMN `patternsPercentage` DOUBLE NULL DEFAULT 50,
    ADD COLUMN `practicesPercentage` DOUBLE NULL DEFAULT 50;
