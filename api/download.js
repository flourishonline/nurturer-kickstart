const PDFDocument = require('pdfkit');
const {
  Document, Packer, Paragraph, TextRun,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, PageNumber
} = require('docx');
const { setCorsHeaders } = require('../lib/utils.js');

// Flourish brand colours (hex without #)
const COLORS = {
  crimson: 'BE1650',
  darkEmerald: '193133',
  grey: '6B6B6B'
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { results, formData } = req.body || {};
    const format = (req.query.format || 'pdf').toLowerCase();

    if (!results || !formData) return res.status(400).json({ error: 'Missing results or formData' });

    const name = formData.yourName || 'Your';
    const businessName = formData.businessName || name;

    if (format === 'pdf') {
      const buffer = await generatePdf(results, formData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Nurturer_Kick_Start.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } else if (format === 'docx') {
      const buffer = await generateDocx(results, formData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="Nurturer_Kick_Start.docx"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use pdf or docx.' });
    }
  } catch (err) {
    console.error('download error:', err);
    return res.status(500).json({ error: 'Download failed. Please try again.' });
  }
};

// =========================================================
// PDF GENERATION
// =========================================================
function generatePdf(results, formData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: 'Nurturer Brand Kick Start',
          Author: 'Flourish Online',
          Creator: 'Flourish Online'
        }
      });

      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const name = formData.yourName || 'Your';

      // Cover
      doc.moveDown(6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(`#${COLORS.crimson}`)
        .text('FLOURISH ONLINE', { align: 'center', characterSpacing: 3 });
      doc.moveDown(3);
      doc.font('Times-Bold').fontSize(32).fillColor(`#${COLORS.darkEmerald}`)
        .text(`${name}'s`, { align: 'center' });
      doc.font('Times-Italic').fontSize(28).fillColor(`#${COLORS.darkEmerald}`)
        .text('Nurturer Brand', { align: 'center' });
      doc.font('Times-Bold').fontSize(36).fillColor(`#${COLORS.crimson}`)
        .text('Kick Start', { align: 'center' });
      doc.moveDown(2);
      doc.font('Helvetica-Oblique').fontSize(12).fillColor(`#${COLORS.grey}`)
        .text('Your personalised brand strategy, tagline options, social bio,', { align: 'center' });
      doc.text('content pillars, offer structure, and 90 day plan.', { align: 'center' });
      doc.moveDown(6);
      doc.font('Helvetica').fontSize(10).fillColor(`#${COLORS.crimson}`)
        .text('flourishonline.com', { align: 'center' });

      // Helper to render a section
      const renderSection = (num, title, render) => {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(10).fillColor(`#${COLORS.crimson}`)
          .text(`SECTION ${num}`, { characterSpacing: 2 });
        doc.moveDown(0.5);
        doc.font('Times-Bold').fontSize(26).fillColor(`#${COLORS.darkEmerald}`).text(title);
        doc.moveDown(0.5);
        // Separator line
        doc.moveTo(72, doc.y).lineTo(540, doc.y).strokeColor(`#${COLORS.crimson}`).lineWidth(1.5).stroke();
        doc.moveDown(1);
        render();
      };

      const pSub = (text) => {
        doc.font('Times-Bold').fontSize(14).fillColor(`#${COLORS.darkEmerald}`).text(text);
        doc.moveDown(0.3);
      };
      const pBody = (text) => {
        doc.font('Helvetica').fontSize(11).fillColor('#333333').text(text, { lineGap: 3 });
        doc.moveDown(0.8);
      };
      const pList = (items) => {
        items.forEach(item => {
          doc.font('Helvetica').fontSize(11).fillColor('#333333')
            .text(`•  ${item}`, { indent: 0, lineGap: 3 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);
      };
      const pEyebrow = (text) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(`#${COLORS.crimson}`)
          .text(text, { characterSpacing: 2 });
        doc.moveDown(0.3);
      };

      // Section 1: Brand Foundation
      renderSection(1, 'Your Brand Foundation', () => {
        pSub('Your Why');
        pBody(results.brandFoundation.why);
        pSub('Your Vision');
        pBody(results.brandFoundation.vision);
        pSub('Your Mission');
        pBody(results.brandFoundation.mission);
        pSub('Your Values');
        pList(results.brandFoundation.values);
        pSub('Your Weird');
        pBody(results.brandFoundation.weird);
        pSub('Your Love Factor');
        pBody(results.brandFoundation.loveFactor);
      });

      // Section 2: Taglines
      renderSection(2, 'Tagline Options', () => {
        results.taglines.forEach(t => {
          doc.font('Times-Italic').fontSize(15).fillColor(`#${COLORS.darkEmerald}`)
            .text(t, { lineGap: 4 });
          doc.moveDown(0.8);
        });
      });

      // Section 3: Social Bio
      renderSection(3, 'Social Bio', () => {
        pEyebrow('SHORT VERSION');
        pBody(results.socialBio.short);
        pEyebrow('LONG VERSION');
        pBody(results.socialBio.long);
      });

      // Section 4: Content Pillars
      renderSection(4, 'Content Pillars & Post Ideas', () => {
        results.contentPillars.forEach(p => {
          pSub(p.pillar);
          pBody(p.description);
          pEyebrow('POST IDEAS');
          pList(p.postIdeas);
        });
      });

      // Section 5: Offer Structure
      renderSection(5, 'Offer Structure', () => {
        pSub('Your current offers, reviewed');
        pBody(results.offerStructure.review);
        pSub('Recommended offer suite');
        results.offerStructure.recommendedSuite.forEach(offer => {
          pEyebrow(offer.tier.toUpperCase());
          doc.font('Times-Bold').fontSize(13).fillColor(`#${COLORS.crimson}`).text(offer.name);
          doc.moveDown(0.3);
          pBody(offer.description);
        });
        pSub('Key refinements');
        pList(results.offerStructure.refinements);
      });

      // Section 6: 90 Day Plan
      renderSection(6, 'Your 90 Day Kick Start Plan', () => {
        doc.font('Times-Italic').fontSize(12).fillColor(`#${COLORS.grey}`)
          .text(results.ninetyDayPlan.intro, { lineGap: 3 });
        doc.moveDown(1);

        results.ninetyDayPlan.weeks.forEach((w, i) => {
          if (doc.y > 680) doc.addPage();
          doc.font('Helvetica-Bold').fontSize(9).fillColor(`#${COLORS.crimson}`)
            .text(`WEEK ${i + 1}`, { characterSpacing: 2 });
          doc.moveDown(0.2);
          doc.font('Times-Bold').fontSize(14).fillColor(`#${COLORS.darkEmerald}`).text(w.theme);
          doc.moveDown(0.4);
          pList(w.tasks);
        });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// =========================================================
// DOCX GENERATION
// =========================================================
async function generateDocx(results, formData) {
  const name = formData.yourName || 'Your';

  const h1 = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text })],
    pageBreakBefore: true,
    spacing: { before: 0, after: 360 }
  });
  const h2 = (text) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text })],
    spacing: { before: 320, after: 160 }
  });
  const h3 = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: COLORS.crimson, allCaps: true, characterSpacing: 40 })],
    spacing: { before: 240, after: 80 }
  });
  const body = (text) => new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 180, line: 320 }
  });
  const bullet = (text) => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 120, line: 300 }
  });
  const italicBody = (text) => new Paragraph({
    children: [new TextRun({ text, size: 22, italics: true, color: COLORS.grey })],
    spacing: { after: 200, line: 320 }
  });
  const eyebrow = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 18, color: COLORS.crimson, characterSpacing: 40 })],
    spacing: { before: 200, after: 80 }
  });

  const children = [];

  // Cover
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '', size: 24 })],
      spacing: { before: 2400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'FLOURISH ONLINE', size: 20, color: COLORS.crimson, bold: true, characterSpacing: 60 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `${name}'s`, size: 48, bold: true, color: COLORS.darkEmerald })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Nurturer Brand', size: 42, italics: true, color: COLORS.darkEmerald })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Kick Start', size: 60, bold: true, color: COLORS.crimson })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Your personalised brand strategy, tagline options, social bio, content pillars, offer structure, and 90 day plan.', size: 22, italics: true, color: COLORS.grey })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'flourishonline.com', size: 18, color: COLORS.crimson })],
      alignment: AlignmentType.CENTER
    })
  );

  // Section 1: Brand Foundation
  children.push(
    h1('1. Your Brand Foundation'),
    h2('Your Why'),
    body(results.brandFoundation.why),
    h2('Your Vision'),
    body(results.brandFoundation.vision),
    h2('Your Mission'),
    body(results.brandFoundation.mission),
    h2('Your Values'),
    ...results.brandFoundation.values.map(v => bullet(v)),
    h2('Your Weird'),
    body(results.brandFoundation.weird),
    h2('Your Love Factor'),
    body(results.brandFoundation.loveFactor)
  );

  // Section 2: Taglines
  children.push(h1('2. Tagline Options'));
  results.taglines.forEach(t => {
    children.push(new Paragraph({
      children: [new TextRun({ text: t, size: 26, italics: true, color: COLORS.darkEmerald })],
      spacing: { before: 200, after: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.crimson, space: 8 } }
    }));
  });

  // Section 3: Social Bio
  children.push(
    h1('3. Social Bio'),
    eyebrow('SHORT VERSION'),
    body(results.socialBio.short),
    eyebrow('LONG VERSION')
  );
  results.socialBio.long.split('\n').forEach(para => {
    if (para.trim()) children.push(body(para.trim()));
  });

  // Section 4: Content Pillars
  children.push(h1('4. Content Pillars and Post Ideas'));
  results.contentPillars.forEach(p => {
    children.push(h2(p.pillar));
    children.push(body(p.description));
    children.push(eyebrow('POST IDEAS'));
    p.postIdeas.forEach(idea => children.push(bullet(idea)));
  });

  // Section 5: Offer Structure
  children.push(
    h1('5. Offer Structure'),
    h2('Your current offers, reviewed'),
    body(results.offerStructure.review),
    h2('Recommended offer suite')
  );
  results.offerStructure.recommendedSuite.forEach(offer => {
    children.push(
      eyebrow(offer.tier.toUpperCase()),
      new Paragraph({
        children: [new TextRun({ text: offer.name, bold: true, size: 26, color: COLORS.crimson })],
        spacing: { after: 120 }
      }),
      body(offer.description)
    );
  });
  children.push(h2('Key refinements'));
  results.offerStructure.refinements.forEach(r => children.push(bullet(r)));

  // Section 6: 90 Day Plan
  children.push(
    h1('6. Your 90 Day Kick Start Plan'),
    italicBody(results.ninetyDayPlan.intro)
  );
  results.ninetyDayPlan.weeks.forEach((w, i) => {
    children.push(
      eyebrow(`WEEK ${i + 1}`),
      new Paragraph({
        children: [new TextRun({ text: w.theme, bold: true, size: 28, color: COLORS.darkEmerald })],
        spacing: { after: 120 }
      })
    );
    w.tasks.forEach(t => children.push(bullet(t)));
  });

  const doc = new Document({
    creator: 'Flourish Online',
    title: 'Nurturer Brand Kick Start',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } }
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 48, bold: true, font: 'Calibri', color: COLORS.crimson },
          paragraph: { spacing: { before: 480, after: 320 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 30, bold: true, font: 'Calibri', color: COLORS.darkEmerald },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'flourishonline.com  ·  Page ', size: 16, color: COLORS.grey }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COLORS.grey })
            ]
          })]
        })
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}
