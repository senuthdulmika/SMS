// Shared toJSON options: expose `id`, hide `_id` and `__v`
export const jsonOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_doc: unknown, ret: Record<string, any>) => {
    ret.id = ret._id
    delete ret._id
    return ret
  }
}
