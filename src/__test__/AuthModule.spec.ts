import { AuthModule } from '../AuthModule'

describe('sample', () => {
  let auth: AuthModule
  beforeEach(() => {
    auth = new AuthModule()
  })

  it('should exist', async () => {
    expect(auth).toBeDefined()
  })
})
