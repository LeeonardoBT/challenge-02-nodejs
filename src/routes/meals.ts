import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { knex } from "../database"
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists"

export async function mealsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`)
  })

  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date()
      })

      const { name, description, isOnDiet, date } = createMealBodySchema.parse(request.body)

      await knex('meals').insert({
        id: randomUUID(),
        name,
        description,
        is_on_diet: isOnDiet,
        date: date.getTime(),
        user_id: request.user?.id,
      })

      return reply.status(201).send()
  })

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {

      const meals = await knex('meals').where({
          user_id: request.user?.id,
        })
        .select()

      return reply.status(200).send(meals)
  })

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {

      const mealsOnDiet = await knex('meals').where({
          user_id: request.user?.id,
          is_on_diet: true
        })
        .count('id', { as: 'total' })
        .first()

        const mealsOffDiet = await knex('meals').where({
            user_id: request.user?.id,
            is_on_diet: false
          })
          .count('id', { as: 'total' })
          .first()

      const meals = await knex('meals').where({
          user_id: request.user?.id,
        })
        .orderBy('date', 'desc')

      const { bestOnDietSequence } = meals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }

          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence
          }

          return acc
        },
        { bestOnDietSequence: 0, currentSequence: 0 },
      )

      return reply.status(200).send({ 
        metrics: {
          totalMeals: meals.length,
          totalMealsOnDiet: mealsOnDiet?.total,
          totalMealsOffDiet: mealsOffDiet?.total,
          bestOnDietSequence
        }
      })
  })

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id }).first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      const meals = await knex('meals').where({
          user_id: request.user?.id,
          id
        })
        .select()

      return reply.status(200).send(meals)
  })

  app.put(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {
      const putMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const putMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date()
      })

      const { id } = putMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id }).first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }
      
      const { name, description, isOnDiet, date } = putMealBodySchema.parse(request.body)

      await knex('meals').where({
          user_id: request.user?.id,
         id
        })
        .update({
          name,
          description,
          is_on_diet: isOnDiet,
          date: date.getTime()
        })

    return reply.status(200).send()
  })

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },  
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = deleteMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id }).first()

      if (!meal) {
        return reply.status(404).send({ error: 'Meal not found' })
      }

      await knex('meals').where({
          user_id: request.user?.id,
         id
        })
        .delete()

    return reply.status(200).send()
  })
}