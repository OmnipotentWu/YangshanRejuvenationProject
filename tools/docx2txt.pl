#!/usr/bin/perl
# Extract text from .docx (word/document.xml), preserving paragraphs and table cells.
use strict;
use warnings;
use utf8;
binmode(STDOUT, ':encoding(UTF-8)');

my $xml;
if (defined $ARGV[0] && $ARGV[0] eq 'stdin') {
    binmode(STDIN, ':encoding(UTF-8)');
    $xml = do { local $/; <STDIN> };
} else {
    my $file = $ARGV[0] or die "usage: docx2txt.pl file.docx | docx2txt.pl stdin\n";
    open my $fh, '<:raw', $file or die "cannot open $file\n";
    local $/;
    $xml = <$fh>;
}

$xml =~ s/^\x{FEFF}//;
# Normalize: mark paragraph and cell boundaries before stripping tags
$xml =~ s{</w:p>}{\n}g;
$xml =~ s{</w:tr>}{\n}g;
$xml =~ s{</w:tc>}{ | }g;
$xml =~ s{<w:tab/>}{\t}g;
$xml =~ s{<w:br/>}{\n}g;
# Strip all tags
$xml =~ s{<[^>]+>}{}g;
# Decode XML entities
for ($xml) {
    s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&apos;/'/g; s/&amp;/&/g;
}
# Collapse blank lines
$xml =~ s/[ \t]+\n/\n/g;
$xml =~ s/\n{3,}/\n\n/g;
print $xml;
