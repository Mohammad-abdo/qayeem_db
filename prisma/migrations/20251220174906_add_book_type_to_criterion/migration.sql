-- AlterTable
ALTER TABLE `criteria` ADD COLUMN `bookType` ENUM('PRACTICES', 'PATTERNS') NULL;

-- CreateIndex
CREATE INDEX `criteria_bookType_idx` ON `criteria`(`bookType`);
