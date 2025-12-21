const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedBookCategories() {
  try {
    console.log('🌱 Starting to seed book categories...')

    // Get first evaluation if exists (optional)
    const firstEvaluation = await prisma.evaluation.findFirst({
      where: { status: 'ACTIVE' }
    })

    const categories = [
      {
        name: 'Physical Health',
        nameAr: 'الصحة البدنية',
        description: 'Books related to physical health and wellness',
        descriptionAr: 'كتب تتعلق بالصحة البدنية واللياقة',
        evaluationId: firstEvaluation?.id || null,
        order: 1,
        isActive: true,
      },
      {
        name: 'Mental Health',
        nameAr: 'الصحة النفسية',
        description: 'Books about mental health and psychology',
        descriptionAr: 'كتب عن الصحة النفسية وعلم النفس',
        evaluationId: firstEvaluation?.id || null,
        order: 2,
        isActive: true,
      },
      {
        name: 'Professional Development',
        nameAr: 'التطوير المهني',
        description: 'Books for career and professional growth',
        descriptionAr: 'كتب للتطوير المهني والنمو الوظيفي',
        evaluationId: firstEvaluation?.id || null,
        order: 3,
        isActive: true,
      },
      {
        name: 'Personal Growth',
        nameAr: 'النمو الشخصي',
        description: 'Books for personal development and self-improvement',
        descriptionAr: 'كتب للتطوير الشخصي وتحسين الذات',
        evaluationId: firstEvaluation?.id || null,
        order: 4,
        isActive: true,
      },
      {
        name: 'Business & Management',
        nameAr: 'الأعمال والإدارة',
        description: 'Books about business strategies and management',
        descriptionAr: 'كتب عن استراتيجيات الأعمال والإدارة',
        evaluationId: firstEvaluation?.id || null,
        order: 5,
        isActive: true,
      },
      {
        name: 'Leadership',
        nameAr: 'القيادة',
        description: 'Books on leadership and team management',
        descriptionAr: 'كتب عن القيادة وإدارة الفرق',
        evaluationId: firstEvaluation?.id || null,
        order: 6,
        isActive: true,
      },
    ]

    // Check if categories already exist
    const existingCategories = await prisma.bookCategory.findMany({
      where: {
        name: {
          in: categories.map(c => c.name)
        }
      }
    })

    if (existingCategories.length > 0) {
      console.log(`⚠️  Found ${existingCategories.length} existing categories. Skipping duplicates.`)
      const existingNames = existingCategories.map(c => c.name)
      categories.forEach(cat => {
        if (!existingNames.includes(cat.name)) {
          console.log(`   Adding: ${cat.nameAr} (${cat.name})`)
        }
      })
    }

    // Create categories that don't exist
    for (const category of categories) {
      const existing = await prisma.bookCategory.findUnique({
        where: { name: category.name }
      })

      if (!existing) {
        await prisma.bookCategory.create({
          data: category
        })
        console.log(`✅ Created category: ${category.nameAr} (${category.name})`)
      } else {
        console.log(`⏭️  Skipped existing category: ${category.nameAr}`)
      }
    }

    // Get all categories to link with books
    const allCategories = await prisma.bookCategory.findMany({
      where: { isActive: true }
    })
    
    console.log(`\n📚 Found ${allCategories.length} active categories`)
    
    // Create a mapping from category string names to category IDs
    const categoryNameMap = {}
    allCategories.forEach(cat => {
      if (cat.name) categoryNameMap[cat.name] = cat.id
      if (cat.nameAr) categoryNameMap[cat.nameAr] = cat.id
    })
    
    // Get books without categoryId (but might have category string field)
    const booksWithoutCategoryId = await prisma.book.findMany({
      where: {
        categoryId: null
      }
    })

    console.log(`📚 Found ${booksWithoutCategoryId.length} books without categoryId`)

    if (booksWithoutCategoryId.length > 0 && allCategories.length > 0) {
      console.log(`\n📚 Linking ${booksWithoutCategoryId.length} books to categories...`)
      
      let linkedCount = 0
      
      for (let i = 0; i < booksWithoutCategoryId.length; i++) {
        const book = booksWithoutCategoryId[i]
        let categoryId = null
        
        // Try to match by category string field first
        if (book.category && categoryNameMap[book.category]) {
          categoryId = categoryNameMap[book.category]
        } else if (book.categoryAr && categoryNameMap[book.categoryAr]) {
          categoryId = categoryNameMap[book.categoryAr]
        }
        
        // If no match found, randomly assign a category
        if (!categoryId) {
          const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)]
          categoryId = randomCategory.id
          console.log(`   🔀 Randomly assigned "${book.titleAr || book.title}" to "${randomCategory.nameAr}"`)
        } else {
          const matchedCategory = allCategories.find(c => c.id === categoryId)
          console.log(`   ✅ Matched "${book.titleAr || book.title}" to "${matchedCategory?.nameAr || matchedCategory?.name}" by category name`)
        }
        
        await prisma.book.update({
          where: { id: book.id },
          data: { categoryId }
        })
        
        linkedCount++
      }
      
      console.log(`\n✅ Successfully linked ${linkedCount} books to categories`)
    }

    console.log('\n✨ Book categories seeding completed!')
    console.log(`📊 Total categories: ${allCategories.length}`)
    console.log(`📚 Books updated: ${booksWithoutCategory.length}`)

  } catch (error) {
    console.error('❌ Error seeding book categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedBookCategories()
  .then(() => {
    console.log('\n🎉 Seeding process finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding process failed:', error)
    process.exit(1)
  })



