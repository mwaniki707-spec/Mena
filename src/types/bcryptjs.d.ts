declare module 'bcryptjs' {
  const bcrypt: {
    hashSync(data: string, salt: number | string): string;
    compareSync(data: string, encrypted: string): boolean;
  };
  export default bcrypt;
}
