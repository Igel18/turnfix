namespace turnfix.Repository
{
    using turnfix.Models;

    internal class AthleteRepository
    {
        public List<Athlete> ShowAll(TurnfixContext context)
        {
            var teilnehmer = context.TfxTeilnehmers.Where(t => t.IntVereineid == 1).ToList();

            return teilnehmer;
        }

        public Athlete GetAthleteById(TurnfixContext context, int id)
        {
            var athlete = context.TfxTeilnehmers.FirstOrDefault(t => t.IntTeilnehmerid == id);
            return athlete;
        }
    }
}