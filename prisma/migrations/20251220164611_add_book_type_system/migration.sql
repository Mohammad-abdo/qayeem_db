/*
  Warnings:

  - A unique constraint covering the columns `[bookType,evaluationId]` on the table `book_evaluations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `book_evaluations` ADD COLUMN `bookType` ENUM('PRACTICES', 'PATTERNS') NULL,
    MODIFY `bookId` INTEGER NULL;

-- AlterTable
ALTER TABLE `book_progress` ADD COLUMN `bookType` ENUM('PRACTICES', 'PATTERNS') NULL;

-- AlterTable
ALTER TABLE `books` ADD COLUMN `bookType` ENUM('PRACTICES', 'PATTERNS') NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `bookType` ENUM('PRACTICES', 'PATTERNS') NULL;

-- CreateIndex
CREATE INDEX `book_evaluations_bookType_idx` ON `book_evaluations`(`bookType`);

-- CreateIndex
CREATE UNIQUE INDEX `book_evaluations_bookType_evaluationId_key` ON `book_evaluations`(`bookType`, `evaluationId`);

-- CreateIndex
CREATE INDEX `book_progress_bookType_idx` ON `book_progress`(`bookType`);

-- CreateIndex
CREATE INDEX `books_bookType_idx` ON `books`(`bookType`);

-- CreateIndex
CREATE INDEX `payments_bookType_idx` ON `payments`(`bookType`);
