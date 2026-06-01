import { NextResponse } from 'next/server';
import { localDb } from '@/lib/dbFallback';

// GET /api/finances
export async function GET() {
  try {
    const projects = localDb.getProjects();
    const expenses = localDb.getExpenses();
    return NextResponse.json({ projects, expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/finances
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actionType } = body; // 'project' or 'expense'

    if (actionType === 'project') {
      const { name, amount, type, davidShare, samuelShare, receivedBy } = body;
      
      if (!name || isNaN(amount) || !type) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos para el proyecto.' }, { status: 400 });
      }

      const newProj = localDb.addProject({
        name,
        amount: parseFloat(amount),
        type,
        davidShare: parseFloat(davidShare),
        samuelShare: parseFloat(samuelShare),
        receivedBy: receivedBy || 'company'
      });

      return NextResponse.json({ success: true, project: newProj });

    } else if (actionType === 'expense') {
      const { description, amount, paidBy, splitBetween } = body;

      if (!description || isNaN(amount) || !paidBy || !splitBetween) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos para el gasto.' }, { status: 400 });
      }

      const newExp = localDb.addExpense({
        description,
        amount: parseFloat(amount),
        paidBy,
        splitBetween
      });

      return NextResponse.json({ success: true, expense: newExp });
    }

    return NextResponse.json({ error: 'Tipo de acción inválido.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/finances
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'project' or 'expense'

    if (!id || !type) {
      return NextResponse.json({ error: 'ID y Tipo son obligatorios.' }, { status: 400 });
    }

    if (type === 'project') {
      localDb.deleteProject(id);
      return NextResponse.json({ success: true, message: 'Proyecto eliminado.' });
    } else if (type === 'expense') {
      localDb.deleteExpense(id);
      return NextResponse.json({ success: true, message: 'Gasto eliminado.' });
    }

    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
