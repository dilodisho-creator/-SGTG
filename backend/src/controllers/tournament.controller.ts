import { NextFunction, Request, Response } from 'express';
import { archiveTournament, assignFight, calculateFrentes, calculatePollones, calculatePrizes, cancelFight, createEstablishment, createRooster, createTournament, deleteEstablishment, deleteRooster, deleteTournament, drawFights, editTournament, getTournament, importTournament, listTournaments, reactivateTournament, resetFights, restoreTournament, selectTournament, updateEstablishment, updateFight, updatePrize, updateRooster } from '../services/tournament.service';
import { createBackup, deleteBackup, getAudit, getRanking, listBackups, restoreBackup, updateSettings } from '../services/management.service';

type Handler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

function handle(action: Handler) {
  return (request: Request, response: Response, next: NextFunction) => {
    void action(request, response, next).catch(next);
  };
}

export const tournamentController = {
  get: handle(async (_request, response) => {
    response.json(await getTournament());
  }),
  updateFight: handle(async (request, response) => {
    response.json(await updateFight(Number(request.params.number), request.body));
  }),
  syncPollones: handle(async (_request, response) => {
    response.json({ pollones: await calculatePollones() });
  }),
  syncFrentes: handle(async (_request, response) => {
    response.json({ frentes: await calculateFrentes() });
  }),
  syncPrizes: handle(async (_request, response) => {
    response.json({ premios: await calculatePrizes() });
  }),
  updatePrize: handle(async (request, response) => {
    response.json(await updatePrize(Number(request.params.id), request.body));
  }),
  importTournament: handle(async (request, response) => {
    response.json(await importTournament(request.body));
  }),
  reset: handle(async (_request, response) => {
    response.json({ tournament: await restoreTournament() });
  }),
  resetFights: handle(async (_request, response) => {
    response.json({ tournament: await resetFights() });
  }),
  createEstablishment: handle(async (request, response) => {
    response.status(201).json(await createEstablishment(request.body));
  }),
  deleteEstablishment: handle(async (request, response) => {
    await deleteEstablishment(request.params.id);
    response.status(204).end();
  }),
  updateEstablishment: handle(async (request, response) => {
    response.json(await updateEstablishment(request.params.id, request.body));
  }),
  createRooster: handle(async (request, response) => {
    response.status(201).json(await createRooster(request.body));
  }),
  deleteRooster: handle(async (request, response) => {
    await deleteRooster(request.params.id);
    response.status(204).end();
  }),
  updateRooster: handle(async (request, response) => {
    response.json(await updateRooster(request.params.id, request.body));
  }),
  assignFight: handle(async (request, response) => {
    response.json(await assignFight(request.body));
  }),
  cancelFight: handle(async (request, response) => {
    await cancelFight(Number(request.params.number));
    response.status(204).end();
  }),
  drawFights: handle(async (request, response) => {
    response.json(await drawFights(request.body));
  }),
  tournaments: handle(async (_request, response) => {
    response.json(await listTournaments());
  }),
  createTournament: handle(async (request, response) => {
    response.status(201).json(await createTournament(request.body));
  }),
  selectTournament: handle(async (request, response) => {
    response.json(await selectTournament(request.params.id));
  }),
  editTournament: handle(async (request, response) => {
    response.json(await editTournament(request.params.id, request.body));
  }),
  archiveTournament: handle(async (request, response) => {
    response.json(await archiveTournament(request.params.id));
  }),
  reactivateTournament: handle(async (request, response) => {
    response.json(await reactivateTournament(request.params.id));
  }),
  deleteTournament: handle(async (request, response) => {
    const result = await deleteTournament(request.params.id);
    response.json(result);
  }),
  audit: handle(async (_request, response) => {
    response.json(await getAudit());
  }),
  ranking: handle(async (_request, response) => {
    response.json(await getRanking());
  }),
  settings: handle(async (request, response) => {
    response.json(await updateSettings(request.body));
  }),
  backups: handle(async (_request, response) => {
    response.json(await listBackups());
  }),
  createBackup: handle(async (_request, response) => {
    response.status(201).json(await createBackup());
  }),
  restoreBackup: handle(async (request, response) => {
    response.json(await restoreBackup(request.params.filename));
  }),
  deleteBackup: handle(async (request, response) => {
    await deleteBackup(request.params.filename);
    response.status(204).end();
  }),
};