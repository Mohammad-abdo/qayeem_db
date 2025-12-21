-- AlterTable
ALTER TABLE `books` ADD COLUMN `categoryId` INTEGER NULL;

-- CreateTable
CREATE TABLE `book_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `evaluationId` INTEGER NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `book_categories_name_key`(`name`),
    INDEX `book_categories_name_idx`(`name`),
    INDEX `book_categories_evaluationId_idx`(`evaluationId`),
    INDEX `book_categories_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_evaluations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookId` INTEGER NOT NULL,
    `evaluationId` INTEGER NOT NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `book_evaluations_bookId_idx`(`bookId`),
    INDEX `book_evaluations_evaluationId_idx`(`evaluationId`),
    UNIQUE INDEX `book_evaluations_bookId_evaluationId_key`(`bookId`, `evaluationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `books_categoryId_idx` ON `books`(`categoryId`);

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `books_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `book_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_categories` ADD CONSTRAINT `book_categories_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_evaluations` ADD CONSTRAINT `book_evaluations_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_evaluations` ADD CONSTRAINT `book_evaluations_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
