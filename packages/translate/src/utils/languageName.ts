const languageName = ({
  source,
  target
}: {
  source?: string
  target: string
}) => {
  if (!source) {
    return ''
  }

  const displayNames = new Intl.DisplayNames(target, { type: 'language' })
  return displayNames.of(source)
}

export default languageName
