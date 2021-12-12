const languageName = ({ source, target }) => {
  // @ts-ignore
  const displayNames = new Intl.DisplayNames(target, { type: 'language' })
  return displayNames.of(source)
}

export default languageName
