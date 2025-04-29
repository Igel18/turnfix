using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace turnfix.Repository
{
    using turnfix.Models;

    public class EventRepository
    {
        public List<Event> ShowAll(TurnfixContext context)
        {
            var veranstaltungen = context.TfxVeranstaltungens
                .ToList();
            return veranstaltungen;
        }

        public Event GetById(TurnfixContext context, int id)
        {
            var veranstaltung = context.TfxVeranstaltungens
                .FirstOrDefault(v => v.IntVeranstaltungenid == id);
            return veranstaltung;
        }
    }
}
