# Templates de Tickets SAE POS

## 1. Comanda Completa (`Comanda Completa.saetickets`)

### Variables requeridas
| Variable | Descripción |
|----------|-------------|
| `MESA` | Número o nombre de mesa |
| `PAX` | Cantidad de comensales |
| `TOTAL` | Total de la orden |
| `GUEST_ITEMS_COUNT` | Cantidad de líneas de items |
| `GUEST_ITEMS_0_DESC` | Descripción del ítem (puede incluir prefijo de persona) |

### Formato de datos POS
```json
{
  "MESA": "M12",
  "PAX": "3",
  "TOTAL": "24500",
  "GUEST_ITEMS_COUNT": "6",
  "GUEST_ITEMS_0_DESC": "--- Carlos ---",
  "GUEST_ITEMS_1_DESC": "  Hamburguesa Angus",
  "GUEST_ITEMS_2_DESC": "  Coca Cola",
  "GUEST_ITEMS_3_DESC": "--- María ---",
  "GUEST_ITEMS_4_DESC": "  Pizza Margherita",
  "GUEST_ITEMS_5_DESC": "  Té frío"
}
```

---

## 2. Ticket Cocina por Ítem (`Ticket Cocina.saetickets`)

### Variables requeridas
| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `MESA` | Número de mesa | Sí |
| `ITEM_NAME` | Nombre del platillo/producto | Sí |
| `QTY` | Cantidad | Sí |
| `PAX` | Número de comensal | Opcional |
| `GUEST_NAME` | Nombre del comensal | Opcional |
| `NOTAS` | Instrucciones especiales | Opcional |
| `KITCHEN_TARGET` | Estación de cocina destino | Opcional |

### Formato de datos POS
```json
{
  "MESA": "M12",
  "ITEM_NAME": "Hamburguesa Angus",
  "QTY": "1",
  "PAX": "1",
  "GUEST_NAME": "Carlos",
  "NOTAS": "Término medio",
  "KITCHEN_TARGET": "Printer-2 (Parrilla)"
}
```

---

## 3. Cierre de Caja (`Cierre de Caja.saetickets`)

### Variables requeridas
| Variable | Descripción |
|----------|-------------|
| `CAJERO` | Nombre del cajero |
| `CAJA` | Número de caja |
| `TURNO` | Turno actual |
| `EFECTIVO` | Total en efectivo |
| `TARJETA` | Total en tarjeta |
| `TRANSFERENCIA` | Total en transferencia |
| `OTROS` | Otros métodos de pago |
| `TOTAL_VENTAS` | Suma total de ventas |
| `IVA` | Impuesto IVA |
| `SERVICIO` | Cargo por servicio |
| `TOTAL_IMPUESTOS` | Suma total de impuestos |

### Variables del sistema (automáticas)
| Variable | Descripción |
|----------|-------------|
| `${!date}` | Fecha actual (dd/MM/yyyy) |
| `${!time}` | Hora actual (HH:mm) |
| `${!datetime}` | Fecha y hora completa |

---

## Uso desde el POS

```csharp
// En PuntoVentaApi.cs — al crear PrintJob
var printJob = new PrintJob
{
    Xml = templateXml,        // XML del template .saetickets
    Data = new Dictionary<string, string>
    {
        ["MESA"] = mesa,
        ["PAX"] = pax.ToString(),
        ["TOTAL"] = total.ToString(),
        ["GUEST_ITEMS_COUNT"] = items.Count.ToString(),
        // ... items flatten
    },
    PrinterName = "Cocina"
};
```

## Carga en SAE Studio

1. Abrir SAE Studio → Diseñador de Tiquetes
2. Archivo → Abrir Archivo Local → seleccionar `.saetickets`
3. Personalizar visualmente si necesario
4. Guardar
