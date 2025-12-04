using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.CommonDtos
{
    public class LookupDto<TKey>
    {
        public required TKey Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
    }
}
