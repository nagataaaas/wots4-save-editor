declare module 'virtual:third-party-licenses' {
  const licenses: {
    name: string
    version: string
    license: string
    text: string | null
  }[]
  export default licenses
}
