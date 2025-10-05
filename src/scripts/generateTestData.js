// scripts/generateTestData.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Project from '../models/Project.js'

dotenv.config()

class TestDataGenerator {
	async connect() {
		await mongoose.connect(process.env.MONGODB_URI)
		console.log('✅ Conectado ao MongoDB')
	}

	async disconnect() {
		await mongoose.disconnect()
		console.log('✅ Conexão fechada')
	}

	// Gerar projetos de teste para um usuário específico
	async generateUserProjects(userEmail, count = 5) {
		await this.connect()

		const user = await User.findOne({ email: userEmail })
		if (!user) {
			console.log('❌ Usuário não encontrado')
			return
		}

		const projects = []
		for (let i = 0; i < count; i++) {
			const project = new Project({
				title: `Projeto de Teste ${i + 1} - ${user.name}`,
				description: `Descrição do projeto de teste ${i + 1} para ${
					user.name
				}. Este é um projeto gerado automaticamente para testes.`,
				client: user._id,
				budget: {
					min: 1000 + i * 500,
					max: 3000 + i * 800,
					currency: 'BRL',
				},
				category: 'Desenvolvimento Web',
				skills: ['JavaScript', 'React', 'Node.js'],
				timeline: `${2 + i} semanas`,
				status: 'open',
			})
			await project.save()
			projects.push(project)
		}

		console.log(`✅ ${projects.length} projetos de teste criados para ${user.name}`)
		await this.disconnect()
	}

	// Gerar freelancers com habilidades específicas
	async generateFreelancersWithSkills(skills, count = 3) {
		await this.connect()

		const freelancers = []
		for (let i = 0; i < count; i++) {
			const freelancer = new User({
				name: `Freelancer ${skills.join(' ')} ${i + 1}`,
				email: `freelancer.${skills.join('.').toLowerCase()}${i + 1}@email.com`,
				password: '123456',
				userType: 'freelancer',
				title: `Especialista em ${skills.join(', ')}`,
				bio: `Freelancer especializado em ${skills.join(', ')} com ampla experiência no mercado.`,
				hourlyRate: 60 + i * 10,
				skills: skills,
				location: 'São Paulo, SP',
				profileComplete: true,
			})
			await freelancer.save()
			freelancers.push(freelancer)
		}

		console.log(`✅ ${freelancers.length} freelancers com skills ${skills.join(', ')} criados`)
		await this.disconnect()
	}
}

// Exemplos de uso:
const generator = new TestDataGenerator()

// Para usar:
// generator.generateUserProjects('contato@techsolutions.com', 3);
// generator.generateFreelancersWithSkills(['React', 'TypeScript'], 2);

export default TestDataGenerator
