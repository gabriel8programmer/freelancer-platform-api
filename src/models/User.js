// models/User.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Nome é obrigatório'],
			trim: true,
		},
		email: {
			type: String,
			required: [true, 'Email é obrigatório'],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: function () {
				return this.loginType === 'email'
			},
			minlength: 6,
		},
		avatar: {
			type: String,
			default: '👤',
		},
		userType: {
			type: String,
			enum: ['freelancer', 'client'],
			required: true,
		},
		loginType: {
			type: String,
			enum: ['email', 'google'],
			default: 'email',
		},
		profileComplete: {
			type: Boolean,
			default: false,
		},
		// Campos específicos do freelancer
		title: String,
		bio: String,
		hourlyRate: Number,
		skills: [String],
		portfolio: String,
		location: String,
		phone: String,
		experience: {
			type: String,
			enum: ['junior', 'pleno', 'senior', null],
			default: null,
		},
		rating: {
			type: Number,
			default: 0,
			min: 0,
			max: 5,
		},
		completedProjects: {
			type: Number,
			default: 0,
		},
		// Campos específicos do cliente
		company: String,
		website: String,
	},
	{
		timestamps: true,
	},
)

// Hash password antes de salvar
userSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next()

	this.password = await bcrypt.hash(this.password, 12)
	next()
})

// Comparar password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
	return await bcrypt.compare(candidatePassword, userPassword)
}

// Remover password do output
userSchema.methods.toJSON = function () {
	const user = this.toObject()
	delete user.password
	return user
}

export default mongoose.model('User', userSchema)
