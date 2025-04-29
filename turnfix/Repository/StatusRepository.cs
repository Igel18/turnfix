using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace turnfix.Repository
{
    using System.Drawing;

    using turnfix.Models;

    public class StatusRepository
    {
        public List<Status> GetAll(TurnfixContext context)
        {
            var status = context.TfxStatuses
                .ToList();
            return status;
        }

        public Status GetById(TurnfixContext context, int id)
        {
            var status = context.TfxStatuses
                .FirstOrDefault(v => v.IntStatusid == id);
            return status;
        }
    }
}
