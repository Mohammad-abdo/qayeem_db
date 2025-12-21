-- AlterTable
ALTER TABLE `books` ADD COLUMN `discountPercentage` DOUBLE NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `couponId` INTEGER NULL,
    ADD COLUMN `discountAmount` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `discount_coupons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    `discountValue` DECIMAL(10, 2) NOT NULL,
    `minPurchaseAmount` DECIMAL(10, 2) NULL,
    `maxDiscountAmount` DECIMAL(10, 2) NULL,
    `userId` INTEGER NULL,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validUntil` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `discount_coupons_code_key`(`code`),
    INDEX `discount_coupons_code_idx`(`code`),
    INDEX `discount_coupons_userId_idx`(`userId`),
    INDEX `discount_coupons_isActive_idx`(`isActive`),
    INDEX `discount_coupons_validFrom_idx`(`validFrom`),
    INDEX `discount_coupons_validUntil_idx`(`validUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payments_couponCode_idx` ON `payments`(`couponCode`);

-- CreateIndex
CREATE INDEX `payments_couponId_idx` ON `payments`(`couponId`);

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `discount_coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discount_coupons` ADD CONSTRAINT `discount_coupons_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discount_coupons` ADD CONSTRAINT `discount_coupons_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
