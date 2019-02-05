import { AuthModule } from '../AuthModule'

describe('sample', () => {
  let auth: AuthModule
  beforeEach(() => {
    auth = new AuthModule({ loginRedir: '/', publicUrl: 'http://lh:3000' }, [])
  })

  it('should exist', async () => {
    expect(auth).toBeDefined()
  })
})
