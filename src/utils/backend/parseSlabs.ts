import { Slab } from "@/types";

export function parseSlabs(data: string): Slab[] {
  // Separa o texto em linhas
  const lines = data.split("\n");
  // Objeto auxiliar para agrupar os slabs pelo ID
  const slabs: Record<string, Slab> = {};

  // Regex para capturar linhas no formato: "STAT <slabID>:<chave> <valor>"
  const regex = /^STAT\s+(\d+):(\w+)\s+(.+)$/;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return; // pula linhas vazias

    const match = trimmedLine.match(regex);
    if (match) {
      const slabId = match[1];
      const key = match[2];
      let value: number | string = match[3];

      // Converte o valor para número se for numérico
      if (!isNaN(Number(value))) {
        value = Number(value);
      }

      // Cria o objeto para o slab, se ainda não existir
      if (!slabs[slabId]) {
        slabs[slabId] = { id: Number(slabId) };
      }

      // Atribui a propriedade ao slab correspondente.
      // Caso o valor não seja numérico, pode-se tratar de outro tipo, mas para esse exemplo esperamos números.
      slabs[slabId][key] = value as number;
    }
  });

  // Converte o objeto em array e ordena pelo id do slab
  return Object.values(slabs).sort((a, b) => a.id - b.id);
}
