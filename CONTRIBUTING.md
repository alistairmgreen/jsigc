# How to Contribute

The *JavaScript IGC Viewer* exists for the benefit of the whole gliding community. With your help, it can be made
more powerful, more reliable, more elegant and hopefully more *useful* in the future.

Even if you are not a programmer, then I would be grateful for any constructive feedback that you may have.

Thanks in advance for your contributions!

## Bug reports, comments and suggestions

If you find a bug, or would like to suggest a change, please check the [Issue Tracker](https://github.com/alistairmgreen/jsigc/issues)
and add a ticket if none already exists.

- Please apply a label to mark the issue as a bug, enhancement or question.
- For bug reports, please indicate which browser you are using (e.g. Firefox / Chrome / Internet Explorer),
  *including the version number.*
    - If you have access to any other browsers, please try those as well. Does the bug affect all of them or is it
      specific to just one particular browser?
- If the bug is triggered by a particular IGC file, then it would be very helpful to include a link
to download a copy of that file.
- For visual flaws, please include a screenshot if you can.

## Help with testing

There are some important tests that I cannot do myself:

### Compatibility:
- Does it work on tablet devices?
- Does it work on Apple Macs?

### Time zones:

IGC files always record the date and time as UTC. In countries with a large time offset from UTC, the
flight may cross midnight and this has to be treated as a special case. However, all of the files
that I have tried are from flights in the UK, so the code for dealing with mid-flight
date changes is untested.

## If you are a programmer or web designer

Code contributions are always welcome. If you are able to implement a new feature, fix a bug, or
make some cosmetic improvements to the interface, then please feel free to:

1. Fork the repository.
2. Create a new branch with a descriptive name and implement your changes.
3. Check for any new commits on the master branch of the original repository. If there are any,
   then merge them into your branch or (preferably) rebase your changes on top of them.
4. Merge the changes into your `gh-pages` branch so that they will become visible on your
   copy of the IGC Viewer website.
5. Push your changes (both the feature branch and the `gh-pages` branch) to GitHub.
6. Send a pull request asking to merge your feature branch into my master branch.




