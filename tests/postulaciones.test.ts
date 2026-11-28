import { describe, expect, it } from 'vitest';
import { estadoTrasEditar, progreso, sugerencias } from '../src/shared/postulaciones.ts';

describe('postulaciones', () => {
  it('progreso cuenta revisadas, borradores y vacías', () => {
    const r = progreso([
      { pregunta: 'a', respuesta: 'x', estado: 'revisada' }, { pregunta: 'b', respuesta: 'y', estado: 'borrador' },
      { pregunta: 'c', respuesta: null, estado: 'vacia' },
    ]);
    expect(r).toMatchObject({ total: 3, revisadas: 1, borrador: 1, vacias: 1, lista: false });
    expect(progreso([{ pregunta: 'a', respuesta: 'x', estado: 'revisada' }]).lista).toBe(true);
  });

  it('editar una respuesta revisada la devuelve a borrador; vaciarla la deja vacía', () => {
    expect(estadoTrasEditar('nuevo texto', 'revisada')).toBe('borrador');
    expect(estadoTrasEditar('texto', 'vacia')).toBe('borrador');
    expect(estadoTrasEditar('  ', 'borrador')).toBe('vacia');
  });

  it('sugiere entradas del banco parecidas a la pregunta, en cualquier idioma del formulario', () => {
    const banco = [
      { id: '1', tema: 'Power', pregunta: 'How much electricity / power do you need (kW)?', respuesta: '6 kW' },
      { id: '2', tema: 'Menu & prices', pregunta: 'Describe your menu and prices', respuesta: 'Bowls 12€' },
      { id: '3', tema: 'Stall size', pregunta: 'Dimensions of your stall or food truck', respuesta: '3x3 m' },
    ];
    expect(sugerencias('What are the dimensions of your stall?', banco)[0]!.id).toBe('3');
    expect(sugerencias('Please list your menu items and prices', banco)[0]!.id).toBe('2');
    expect(sugerencias('Power requirements (kW)', banco)[0]!.id).toBe('1');
    expect(sugerencias('Your favourite colour', banco)).toHaveLength(0);
  });
});
