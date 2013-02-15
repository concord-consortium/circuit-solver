fs     = require 'fs'
{exec} = require 'child_process'

config =
  yuic: '../yuicompressor/build/yuicompressor-2.4.7.jar'  # download from http://yuilibrary.com/download/yuicompressor/

appFiles  = [
  'circuitSolver'
  'complexArithmetic'
  'sylvester.src'
]

task 'compile', 'Build single application file', ->
  appContents = new Array remaining = appFiles.length
  for file, index in appFiles then do (file, index) ->
    fs.readFile "src/#{file}.js", 'utf8', (err, fileContents) ->
      console.log "reading src/#{file}.js"
      throw err if err
      appContents[index] = fileContents
      process() if --remaining is 0
  process = ->
    fs.writeFile 'dist/circuitSolver.js', appContents.join('\n\n'), 'utf8', (err) ->
      console.log 'concatenating all files'
      throw err if err

task 'minify', 'minify compiled *.js file', ->
  exec 'java -jar "'+config.yuic+'" dist/circuitSolver.js -o dist/circuitSolver.min.js', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr

task 'build', 'Build project to dist/circuitSolver.js and minify to dist/circuitSolver.min.js', ->
  invoke 'compile'
  invoke 'minify'