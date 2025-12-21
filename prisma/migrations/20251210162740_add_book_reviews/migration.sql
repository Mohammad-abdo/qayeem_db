-- CreateTable
CREATE TABLE `book_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `commentAr` TEXT NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `book_reviews_bookId_idx`(`bookId`),
    INDEX `book_reviews_userId_idx`(`userId`),
    INDEX `book_reviews_isApproved_idx`(`isApproved`),
    INDEX `book_reviews_rating_idx`(`rating`),
    UNIQUE INDEX `book_reviews_bookId_userId_key`(`bookId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `book_reviews` ADD CONSTRAINT `book_reviews_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_reviews` ADD CONSTRAINT `book_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
