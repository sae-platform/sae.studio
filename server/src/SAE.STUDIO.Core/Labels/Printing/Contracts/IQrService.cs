using System.Drawing;

namespace SAE.STUDIO.Core.Labels.Printing.Contracts;

public interface IQrService
{
    Bitmap Generate(string content, int size);
}
