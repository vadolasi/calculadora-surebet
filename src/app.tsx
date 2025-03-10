import { valibotResolver } from "@hookform/resolvers/valibot"
import { Trash2 } from "lucide-react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import * as v from "valibot"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { NumericFormat } from "react-number-format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table"

const schema = v.object({
  totalInvestment: v.pipe(v.number(), v.minValue(1)),
  odds: v.pipe(
    v.array(
      v.pipe(
        v.object({
          odd: v.pipe(v.number(), v.minValue(1)),
          tax: v.pipe(v.number(), v.minValue(0), v.maxValue(100))
        })
      )
    ),
    v.minLength(2)
  )
})

const calculatePerOddValue = (totalInvestment: number, odds: { odd: number; tax: number }[]) => {
  if (!totalInvestment || !odds || odds.length < 2) {
    return odds.map(() => ({ value: 0, recommended: 0 }));
  }

  const sumOfInverses = odds.reduce((acc, { odd, tax }) => acc + 1 / (odd * (1 - tax / 100)), 0);
  return odds.map(({ odd, tax }) => {
    const value = (totalInvestment / (odd * (1 - tax / 100))) / sumOfInverses;
    const recommended = Math.round(value / 10) * 10;
    return { value, recommended };
  });
};

const calculateProfit = (totalInvestment: number, odds: { odd: number; tax: number }[], perOddValue: { value: number; recommended: number }[]) => {
  if (!totalInvestment || !odds || odds.length < 2 || perOddValue.some(item => Number.isNaN(item.value))) {
    return 0;
  }

  const potentialReturns = odds.map(({ odd, tax }, index) => perOddValue[index].value * odd * (1 - tax / 100));
  const minReturn = Math.min(...potentialReturns);
  return minReturn - totalInvestment;
};

const calculateRecommendedProfit = (totalInvestment: number, odds: { odd: number; tax: number }[], perOddValue: { value: number; recommended: number }[]) => {
  if (!totalInvestment || !odds || odds.length < 2 || perOddValue.some(item => Number.isNaN(item.recommended))) {
    return 0;
  }

  const recommendedTotal = perOddValue.reduce((sum, item) => sum + item.recommended, 0);

  const potentialReturns = odds.map(({ odd, tax }, index) => perOddValue[index].recommended * odd * (1 - tax / 100));
  const minReturn = Math.min(...potentialReturns);
  return minReturn - recommendedTotal;
};

export function App() {
  const {
    control,
    formState: { errors },
    watch
  } = useForm({
    resolver: valibotResolver(schema),
    mode: "onChange",
    defaultValues: {
      totalInvestment: 0,
      odds: [
        { odd: 1, tax: 0 },
        { odd: 1, tax: 0 }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: "odds" })

  const { totalInvestment, odds } = watch()

  const perOddValue = calculatePerOddValue(totalInvestment, odds);

  const profit = calculateProfit(totalInvestment, odds, perOddValue);
  const recommendedProfit = calculateRecommendedProfit(totalInvestment,odds, perOddValue)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl mb-10">Calculadora de surebet</h1>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-4">
          <Controller
            name="totalInvestment"
            control={control}
            render={({ field }) => (
              <NumericFormat
                customInput={Input}
                label="Valor total"
                thousandSeparator="."
                decimalSeparator=","
                decimalScale={2}
                fixedDecimalScale
                prefix="R$"
                onValueChange={({ floatValue }) => field.onChange(floatValue || 0)}
                error={errors.totalInvestment}
              />
            )}
          />
          <Input
            label="Lucro"
            value={`R$ ${profit.toFixed(2)}`}
            readOnly
            disabled
            className={profit > 0 ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}
          />
          <Input
            label="Lucro com valores arredondados"
            value={`R$ ${recommendedProfit.toFixed(2)}`}
            readOnly
            disabled
            className={recommendedProfit > 0 ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Odd</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead>Valor da aposta</TableHead>
              <TableHead>Valor arredondado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>
                  <Controller
                    name={`odds.${index}.odd`}
                    control={control}
                    render={({ field }) => (
                      <NumericFormat
                        customInput={Input}
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        onValueChange={({ floatValue }) => field.onChange(floatValue || 0)}
                        error={errors.odds?.[index]?.odd}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Controller
                    name={`odds.${index}.tax`}
                    control={control}
                    render={({ field }) => (
                      <NumericFormat
                        customInput={Input}
                        decimalSeparator=","
                        suffix="%"
                        decimalScale={2}
                        fixedDecimalScale
                        isAllowed={({ floatValue }) => (floatValue || 0) <= 100}
                        onValueChange={({ floatValue }) => field.onChange(floatValue || 0)}
                        error={errors.odds?.[index]?.tax}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <span>R$ {perOddValue[index]?.value.toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <span>R$ {perOddValue[index]?.recommended.toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 2}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button type="button" onClick={() => append({ odd: 1, tax: 0 })}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
